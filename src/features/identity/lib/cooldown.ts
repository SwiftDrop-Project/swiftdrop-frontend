import * as React from "react";

/*
 * Countdowns that survive a reload: "Resend code in 0:42" after a code was sent, and "Try again in 45 seconds"
 * after a 429. Each countdown has a key (e.g. "verify:ayesha@example.com") and an end time, kept in
 * sessionStorage (with an in-memory copy, because sessionStorage can throw in private mode or when blocked).
 *
 * Components read the seconds left with useCooldown(key). It is an external store, so the clock is read
 * outside render and the server render (no storage) simply shows 0.
 */

/** The API sends at most one code per 60 seconds per account (API.md "Email verification"). */
export const RESEND_COOLDOWN_SECONDS = 60;

const STORAGE_PREFIX = "swiftdrop.cooldown.";
const memory = new Map<string, number>();
const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function readEnd(key: string): number {
  try {
    const stored = Number(sessionStorage.getItem(STORAGE_PREFIX + key));
    if (Number.isFinite(stored) && stored > 0) return stored;
  } catch {
    // fall back to memory
  }
  return memory.get(key) ?? 0;
}

function notify() {
  now = Date.now();
  listeners.forEach((listener) => listener());
}

/** Starts (or restarts) the countdown for `key`. */
export function startCooldown(key: string, seconds: number): void {
  const end = Date.now() + seconds * 1000;
  memory.set(key, end);
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, String(end));
  } catch {
    // memory copy is enough
  }
  notify();
}

/** A code was just sent: "Resend code" waits 60 seconds. */
export function markCodeSent(key: string): void {
  startCooldown(key, RESEND_COOLDOWN_SECONDS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === null) {
    now = Date.now();
    timer = setInterval(notify, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function secondsLeft(key: string | null): number {
  if (key === null) return 0;
  const end = readEnd(key);
  return end > now ? Math.ceil((end - now) / 1000) : 0;
}

/** Seconds left on the countdown for `key` (0 when none is running or `key` is null). Re-renders every second. */
export function useCooldown(key: string | null): number {
  return React.useSyncExternalStore(
    subscribe,
    () => secondsLeft(key),
    () => 0,
  );
}

/** 42 → "0:42", 75 → "1:15". */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Keys used by the screens, in one place so the register form, login and /verify-email agree. */
export const cooldownKeys = {
  verify: (email: string) => `verify:${email.trim().toLowerCase()}`,
  reset: (identifier: string) => `reset:${identifier.trim().toLowerCase()}`,
  rateLimit: (action: string) => `429:${action}`,
};
