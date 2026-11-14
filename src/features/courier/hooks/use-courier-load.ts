"use client";

import * as React from "react";
import { describeCourierError, type CourierError } from "../lib/errors";

export type CourierLoadState<T> =
  | { status: "loading"; data: undefined; error: undefined; refreshing: false }
  | { status: "ready"; data: T; error: undefined; refreshing: boolean }
  | { status: "error"; data: undefined; error: CourierError; refreshing: false };

/**
 * Loads data for `key` (changes when the request changes) and again when `reload` is called. A slow old answer can
 * never overwrite a newer one. Errors are read with describeCourierError; `loadingById` when the key is an id from the
 * URL, so a malformed id reads as "not found".
 *
 * `refresh(data)` shows `data` at once (e.g. the task a write answered with) and loads again in the background; the
 * screen keeps showing that data (`refreshing: true`) instead of a loading state until the fresh answer arrives.
 */
export function useCourierLoad<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  { loadingById = false }: { loadingById?: boolean } = {},
) {
  const [attempt, setAttempt] = React.useState(0);
  const [result, setResult] = React.useState<{
    key: string;
    fullKey: string;
    data?: T;
    error?: CourierError;
  } | null>(null);
  const loadRef = React.useRef(load);

  React.useEffect(() => {
    loadRef.current = load;
  });

  const fullKey = `${key}#${attempt}`;

  React.useEffect(() => {
    const controller = new AbortController();
    loadRef.current(controller.signal)
      .then((data) => setResult({ key, fullKey, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key, fullKey, error: describeCourierError(error, { loadingById }) });
      });
    return () => controller.abort();
  }, [key, fullKey, loadingById]);

  const reload = React.useCallback(() => setAttempt((value) => value + 1), []);

  const refresh = React.useCallback(
    (data: T) => {
      setResult({ key, fullKey, data });
      setAttempt((value) => value + 1);
    },
    [key, fullKey],
  );

  let state: CourierLoadState<T>;
  if (result !== null && result.fullKey === fullKey && result.error !== undefined) {
    state = { status: "error", data: undefined, error: result.error, refreshing: false };
  } else if (result !== null && result.fullKey === fullKey) {
    state = { status: "ready", data: result.data as T, error: undefined, refreshing: false };
  } else if (result !== null && result.key === key && result.data !== undefined) {
    // Loading again for the same key: keep showing what we had.
    state = { status: "ready", data: result.data, error: undefined, refreshing: true };
  } else {
    state = { status: "loading", data: undefined, error: undefined, refreshing: false };
  }
  return { ...state, reload, refresh };
}
