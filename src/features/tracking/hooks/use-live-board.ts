"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import type { DistrictCode } from "@/types";
import { trackingApi } from "../api";
import { subscribeLive } from "../live";
import type { LiveEvent } from "../types";

const MAX_EVENTS = 100;
const UNKNOWN_ERROR = "We couldn't load the latest changes. Try again in a moment.";

function concerns(event: LiveEvent, branch: DistrictCode | ""): boolean {
  return !branch || event.branch === branch || event.origin === branch || event.destination === branch;
}

function merge(events: LiveEvent[], incoming: LiveEvent[]): LiveEvent[] {
  const seen = new Set<string>();
  return [...incoming, ...events]
    .filter((event) => (seen.has(event.eventId) ? false : (seen.add(event.eventId), true)))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, MAX_EVENTS);
}

/**
 * Every parcel's status changes as they happen, for the dispatchers' board: the latest from
 * GET /tracking/live/recent, then each new one from /topic/live (staff WebSocket, cookie checked). Loads the latest
 * again after a reconnect. `branch` ("" for every branch) filters what is shown.
 */
export function useLiveBoard(branch: DistrictCode | "") {
  const [events, setEvents] = React.useState<LiveEvent[]>([]);
  const [loaded, setLoaded] = React.useState<{ branch: string; error?: string } | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [fresh, setFresh] = React.useState<Set<string>>(new Set());

  const loadRecent = React.useCallback(
    (signal?: AbortSignal) =>
      trackingApi
        .recent(branch || undefined, signal)
        .then((recent) => {
          setEvents((current) => merge(current, recent));
          setLoaded({ branch });
        })
        .catch((error: unknown) => {
          if (signal?.aborted) return;
          setLoaded({ branch, error: isApiError(error) ? error.message : UNKNOWN_ERROR });
        }),
    [branch],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void loadRecent(controller.signal);
    return () => controller.abort();
  }, [loadRecent, attempt]);

  // The connection stays open when the branch changes; a reconnect loads the current branch's latest.
  const loadRecentRef = React.useRef(loadRecent);
  React.useEffect(() => {
    loadRecentRef.current = loadRecent;
  });

  React.useEffect(() => {
    const timers = new Set<number>();
    const stop = subscribeLive<LiveEvent>({
      staff: true,
      topic: "/topic/live",
      onMessage: (event) => {
        setEvents((current) => merge(current, [event]));
        // Mark it new for a few seconds, so the eye finds it.
        setFresh((current) => new Set(current).add(event.eventId));
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          setFresh((current) => {
            const next = new Set(current);
            next.delete(event.eventId);
            return next;
          });
        }, 8_000);
        timers.add(timer);
      },
      onConnected: () => void loadRecentRef.current(),
      onConnectionChange: setConnected,
    });
    return () => {
      stop();
      timers.forEach((timer) => window.clearTimeout(timer));
      setConnected(false);
    };
  }, []);

  const shown = events.filter((event) => concerns(event, branch));
  const status = loaded === null || loaded.branch !== branch ? "loading" : loaded.error ? "error" : "ready";
  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);
  return { events: shown, status, error: loaded?.error, connected, fresh, retry } as const;
}
