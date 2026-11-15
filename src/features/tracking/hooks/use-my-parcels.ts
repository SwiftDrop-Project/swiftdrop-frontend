"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import type { PageResponse } from "@/types";
import { trackingApi } from "../api";
import { subscribeLive } from "../live";
import type { IndexedParcel, LiveState, OwnParcelUpdate } from "../types";

export const MY_PARCELS_SIZE = 10;
const POLL_MS = 30_000;
const UNKNOWN_ERROR = "We couldn't load your parcels. Check your connection and try again.";

/** Applies a private update to the row it is about, if it is newer than what the row shows. */
export function applyOwnUpdate(row: IndexedParcel, update: OwnParcelUpdate): IndexedParcel {
  if (row.parcelId !== update.parcelId || update.version <= row.version) return row;
  return {
    ...row,
    status: update.status,
    currentBranch: update.status === "AT_BRANCH" ? update.branch : null,
    failureReason: update.status === "FAILED" ? update.failureReason : null,
    updatedAt: update.occurredAt,
    version: update.version,
  };
}

/**
 * The logged-in customer's latest parcels, kept up to date: loads GET /tracking/mine, then follows their private
 * queue /user/queue/parcels on the logged-in WebSocket. An update for a parcel not on the list (a new booking)
 * reloads it. After every (re)connect it reloads, and while the WebSocket is down it polls every 30 s.
 */
export function useMyParcels() {
  const [data, setData] = React.useState<PageResponse<IndexedParcel> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [fresh, setFresh] = React.useState<ReadonlySet<string>>(new Set());

  const refresh = React.useCallback(
    (signal?: AbortSignal) =>
      trackingApi
        .mine(0, MY_PARCELS_SIZE, signal)
        .then((page) => {
          setData(page);
          setError(null);
        })
        .catch((reason: unknown) => {
          if (signal?.aborted) return;
          // A failed background refresh keeps the list on screen.
          setError(isApiError(reason) ? reason.message : UNKNOWN_ERROR);
        }),
    [],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  // Rows on the list, read by the WebSocket handler (which is set up once).
  const rowsRef = React.useRef<ReadonlySet<string>>(new Set());
  React.useEffect(() => {
    rowsRef.current = new Set(data?.content.map((row) => row.parcelId) ?? []);
  }, [data]);

  React.useEffect(() => {
    const timers = new Set<number>();
    const stop = subscribeLive<OwnParcelUpdate>({
      staff: true,
      topic: "/user/queue/parcels",
      onMessage: (update) => {
        if (!rowsRef.current.has(update.parcelId)) {
          void refresh();
          return;
        }
        setData((current) =>
          current ? { ...current, content: current.content.map((row) => applyOwnUpdate(row, update)) } : current,
        );
        setFresh((current) => new Set(current).add(update.parcelId));
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          setFresh((current) => {
            const next = new Set(current);
            next.delete(update.parcelId);
            return next;
          });
        }, 8_000);
        timers.add(timer);
      },
      onConnected: () => void refresh(),
      onConnectionChange: setConnected,
    });
    return () => {
      stop();
      timers.forEach((timer) => window.clearTimeout(timer));
      setConnected(false);
    };
  }, [refresh]);

  React.useEffect(() => {
    if (connected) return undefined;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [connected, refresh]);

  const status = data ? "ready" : error ? "error" : "loading";
  const live: LiveState = connected ? "live" : data ? "polling" : "connecting";
  const retry = React.useCallback(() => void refresh(), [refresh]);
  return { status, data, error, live, fresh, retry } as const;
}
