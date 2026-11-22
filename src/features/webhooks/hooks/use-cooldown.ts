"use client";

import * as React from "react";

/*
 * Short waits after "Send test" and "Retry" (API.md "Webhooks", "Limits": 10 seconds between two tests of one webhook,
 * and after a delivery's last attempt before a retry; 429 with Retry-After otherwise). Kept here, outside React state,
 * so every button for the same thing shows the same countdown (e.g. the detail page's "Send test" button and the ⋯
 * menu). Only a convenience: the backend enforces the limits.
 */

/** The backend's wait between two tests of one webhook. */
export const TEST_COOLDOWN_SECONDS = 10;

/** When each wait ends (ms since epoch). */
const ends = new Map<string, number>();
/** Whole seconds left per key, recomputed once a second: what components read. */
const secondsLeft = new Map<string, number>();
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | undefined;

function recompute() {
  const now = Date.now();
  for (const [key, end] of ends) {
    const left = Math.ceil((end - now) / 1_000);
    if (left <= 0) {
      ends.delete(key);
      secondsLeft.delete(key);
    } else {
      secondsLeft.set(key, left);
    }
  }
  if (ends.size === 0 && ticker !== undefined) {
    clearInterval(ticker);
    ticker = undefined;
  }
  listeners.forEach((listener) => listener());
}

/** Starts (or extends) a wait of `seconds` for `key`, e.g. "test:<webhook id>" or "retry:<delivery id>". */
export function startCooldown(key: string, seconds: number) {
  const end = Date.now() + Math.max(1, Math.ceil(seconds)) * 1_000;
  ends.set(key, Math.max(end, ends.get(key) ?? 0));
  ticker ??= setInterval(recompute, 1_000);
  recompute();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whole seconds left for `key`; 0 when there's nothing to wait for. Always 0 on the server. */
export function useCooldown(key: string): number {
  return React.useSyncExternalStore(
    subscribe,
    () => secondsLeft.get(key) ?? 0,
    () => 0,
  );
}
