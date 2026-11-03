"use client";

import * as React from "react";
import { readQueryParam } from "../lib/routes";

/** The URL only changes by navigation, which remounts the page, so there is nothing to subscribe to. */
function subscribeToNothing() {
  return () => {};
}

/**
 * A query parameter read in the browser; null during the server render. Pages stay prerenderable
 * (no useSearchParams), like the ?error= handling in LoginForm.
 */
export function useQueryParam(name: string): string | null {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => readQueryParam(name),
    () => null,
  );
}

/** False during the server render and hydration, true afterwards (when the URL can be read). */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}
