"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import { normalizeTrackingNumber } from "@/lib/format";
import { trackingApi } from "../api";
import { subscribeLive } from "../live";
import type { LiveState, Tracking, TrackingUpdate } from "../types";

const POLL_MS = 30_000;
const UNKNOWN_ERROR = "We couldn't load this parcel. Check your connection and try again.";

type Loaded =
  | { key: string; status: "ready"; data: Tracking }
  | { key: string; status: "not-found"; message: string }
  | { key: string; status: "error"; message: string };

export type ParcelTrackingState =
  | { status: "loading" }
  | { status: "ready"; data: Tracking }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string };

/** Adds a live update to the parcel, if it is newer than what we have. */
export function applyUpdate(current: Tracking, update: TrackingUpdate): Tracking {
  if (update.trackingNumber !== current.trackingNumber || update.version <= current.version) return current;
  return {
    ...current,
    status: update.status,
    currentBranch: update.status === "AT_BRANCH" ? update.branch : null,
    updatedAt: update.occurredAt,
    version: update.version,
    history: [
      ...current.history,
      {
        status: update.status,
        branch: update.branch,
        failureReason: update.failureReason,
        occurredAt: update.occurredAt,
      },
    ],
  };
}

/**
 * One parcel, kept up to date: loads GET /track/{number}, then follows /topic/parcels/{number} over the WebSocket.
 * After every (re)connect it loads the parcel again, because updates sent while away aren't replayed. While the
 * WebSocket is down it polls every 30 s instead (design document: polling fallback). A delivered parcel isn't
 * followed any more.
 */
export function useParcelTracking(trackingNumber: string) {
  const number = normalizeTrackingNumber(trackingNumber);
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const key = `${number}#${attempt}`;

  const refresh = React.useCallback(
    (signal?: AbortSignal) =>
      trackingApi
        .get(number, signal)
        .then((data) =>
          setLoaded((current) => {
            // Keep the newer one: a live update may have arrived while this was loading.
            if (current?.key === key && current.status === "ready" && current.data.version > data.version) {
              return current;
            }
            return { key, status: "ready", data };
          }),
        )
        .catch((error: unknown) => {
          if (signal?.aborted) return;
          setLoaded((current) => {
            if (isApiError(error) && error.status === 404) {
              return { key, status: "not-found", message: error.message };
            }
            // A failed background refresh keeps the parcel on screen.
            if (current?.key === key && current.status === "ready") return current;
            return { key, status: "error", message: isApiError(error) ? error.message : UNKNOWN_ERROR };
          });
        }),
    [number, key],
  );

  // First load, and again after "Try again".
  React.useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const ready = loaded?.key === key && loaded.status === "ready" ? loaded.data : null;
  const follow = ready !== null && ready.status !== "DELIVERED";

  // Live updates over the WebSocket.
  React.useEffect(() => {
    if (!follow) return undefined;
    const stop = subscribeLive<TrackingUpdate>({
      topic: `/topic/parcels/${number}`,
      onMessage: (update) =>
        setLoaded((current) =>
          current?.status === "ready" ? { ...current, data: applyUpdate(current.data, update) } : current,
        ),
      onConnected: () => void refresh(),
      onConnectionChange: setConnected,
    });
    return () => {
      stop();
      setConnected(false);
    };
  }, [follow, number, refresh]);

  // Polling while the WebSocket is down.
  React.useEffect(() => {
    if (!follow || connected) return undefined;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [follow, connected, refresh]);

  let state: ParcelTrackingState;
  if (loaded === null || loaded.key !== key) state = { status: "loading" };
  else if (loaded.status === "ready") state = { status: "ready", data: loaded.data };
  else state = { status: loaded.status, message: loaded.message };

  const live: LiveState | null = !follow ? null : connected ? "live" : "polling";
  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);
  return { state, live, retry };
}
