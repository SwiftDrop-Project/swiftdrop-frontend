"use client";

import * as React from "react";
import { describeCourierError, type CourierError } from "../lib/errors";

export type CourierLoadState<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "ready"; data: T; error: undefined }
  | { status: "error"; data: undefined; error: CourierError };

/**
 * Loads data for `key` (changes when the request changes) and again when `reload` is called. A slow old answer can
 * never overwrite a newer one. Errors are read with describeCourierError; `loadingById` when the key is an id from the
 * URL, so a malformed id reads as "not found".
 */
export function useCourierLoad<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  { loadingById = false }: { loadingById?: boolean } = {},
) {
  const [attempt, setAttempt] = React.useState(0);
  const [result, setResult] = React.useState<{ key: string; data?: T; error?: CourierError } | null>(null);
  const loadRef = React.useRef(load);

  React.useEffect(() => {
    loadRef.current = load;
  });

  const fullKey = `${key}#${attempt}`;

  React.useEffect(() => {
    const controller = new AbortController();
    loadRef.current(controller.signal)
      .then((data) => setResult({ key: fullKey, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key: fullKey, error: describeCourierError(error, { loadingById }) });
      });
    return () => controller.abort();
  }, [fullKey, loadingById]);

  const reload = React.useCallback(() => setAttempt((value) => value + 1), []);

  let state: CourierLoadState<T>;
  if (result === null || result.key !== fullKey) {
    state = { status: "loading", data: undefined, error: undefined };
  } else if (result.error !== undefined) {
    state = { status: "error", data: undefined, error: result.error };
  } else {
    state = { status: "ready", data: result.data as T, error: undefined };
  }
  return { ...state, reload };
}
