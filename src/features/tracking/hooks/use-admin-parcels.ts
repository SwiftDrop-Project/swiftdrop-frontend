"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import type { PageResponse } from "@/types";
import { trackingApi } from "../api";
import { subscribeLive } from "../live";
import type { IndexedParcel, LiveEvent, ParcelFilters, ParcelStatusCounts } from "../types";

export const PAGE_SIZE = 20;
const UNKNOWN_ERROR = "We couldn't load the parcels. Try again in a moment.";

type Loaded = { key: string; data?: PageResponse<IndexedParcel>; error?: string };

/** Applies a live change to a row on the page, if it is newer than what the row shows. */
function patch(row: IndexedParcel, event: LiveEvent): IndexedParcel {
  if (event.version <= row.version) return row;
  return {
    ...row,
    status: event.toStatus,
    currentBranch: event.toStatus === "AT_BRANCH" ? event.branch : row.currentBranch,
    failureReason: event.toStatus === "FAILED" ? event.failureReason : null,
    updatedAt: event.occurredAt,
    version: event.version,
  };
}

/**
 * The admin's all-parcels list: one page of GET /admin/tracking/parcels and the counts per status for the same
 * filters. Rows on the page change live (/topic/live, staff WebSocket); changes to parcels not on the page are
 * counted in `missed`, so the page can offer a refresh.
 */
export function useAdminParcels(filters: ParcelFilters, page: number) {
  const key = JSON.stringify([filters, page]);
  const countsKey = JSON.stringify([filters.q, filters.district, filters.from, filters.to]);
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [counts, setCounts] = React.useState<{ key: string; data: ParcelStatusCounts } | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [connected, setConnected] = React.useState(false);
  const [missed, setMissed] = React.useState({ key: "", count: 0 });
  const [fresh, setFresh] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const controller = new AbortController();
    trackingApi
      .adminParcels(filters, page, PAGE_SIZE, controller.signal)
      .then((data) => setLoaded({ key, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoaded({ key, error: isApiError(error) ? error.message : UNKNOWN_ERROR });
      });
    return () => controller.abort();
    // `key` holds the filters and page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  React.useEffect(() => {
    const controller = new AbortController();
    trackingApi
      .adminCounts(filters, controller.signal)
      .then((data) => setCounts({ key: countsKey, data }))
      .catch(() => {
        // The status picker just shows no numbers.
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey, attempt]);

  // The connection stays open while the filters change; each message is checked against the current page.
  const keyRef = React.useRef(key);
  const onPageRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    keyRef.current = key;
    onPageRef.current = new Set(
      loaded?.key === key && loaded.data ? loaded.data.content.map((row) => row.parcelId) : [],
    );
  });

  React.useEffect(() => {
    const timers = new Set<number>();
    const stop = subscribeLive<LiveEvent>({
      staff: true,
      topic: "/topic/live",
      onMessage: (event) => {
        if (onPageRef.current.has(event.parcelId)) {
          setLoaded((current) => {
            if (!current?.data) return current;
            const content = current.data.content.map((row) =>
              row.parcelId === event.parcelId ? patch(row, event) : row,
            );
            return { ...current, data: { ...current.data, content } };
          });
        } else {
          setMissed((current) =>
            current.key === keyRef.current ? { ...current, count: current.count + 1 } : { key: keyRef.current, count: 1 },
          );
          return;
        }
        setFresh((current) => new Set(current).add(event.parcelId));
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          setFresh((current) => {
            const next = new Set(current);
            next.delete(event.parcelId);
            return next;
          });
        }, 8_000);
        timers.add(timer);
      },
      onConnectionChange: setConnected,
    });
    return () => {
      stop();
      timers.forEach((timer) => window.clearTimeout(timer));
      setConnected(false);
    };
  }, []);

  const current = loaded?.key === key ? loaded : null;
  const status = current === null ? "loading" : current.error ? "error" : "ready";
  const reload = React.useCallback(() => {
    setMissed({ key: "", count: 0 });
    setAttempt((value) => value + 1);
  }, []);

  return {
    status,
    data: current?.data,
    error: current?.error,
    counts: counts?.key === countsKey ? counts.data : undefined,
    missed: missed.key === key ? missed.count : 0,
    connected,
    fresh,
    reload,
  } as const;
}
