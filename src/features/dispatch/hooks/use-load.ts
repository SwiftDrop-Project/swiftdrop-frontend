"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";

export type LoadState<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "ready"; data: T; error: undefined }
  | { status: "error"; data: undefined; error: string };

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

/**
 * Loads data for `key` (any string that changes when the request changes) and loads it again when the key changes
 * or `reload` is called. A null key loads nothing. The previous answer is ignored once the key has changed, so a
 * slow old request can never overwrite a newer one.
 */
export function useLoad<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = React.useState(0);
  const [result, setResult] = React.useState<{ key: string; data?: T; error?: string } | null>(null);
  const loadRef = React.useRef(load);

  React.useEffect(() => {
    loadRef.current = load;
  });

  const fullKey = key === null ? null : `${key}#${attempt}`;

  React.useEffect(() => {
    if (fullKey === null) return undefined;
    const controller = new AbortController();
    loadRef.current(controller.signal)
      .then((data) => setResult({ key: fullKey, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key: fullKey, error: isApiError(error) ? error.message : UNKNOWN_ERROR });
      });
    return () => controller.abort();
  }, [fullKey]);

  const reload = React.useCallback(() => setAttempt((value) => value + 1), []);

  let state: LoadState<T>;
  if (result === null || result.key !== fullKey) {
    state = { status: "loading", data: undefined, error: undefined };
  } else if (result.error !== undefined) {
    state = { status: "error", data: undefined, error: result.error };
  } else {
    state = { status: "ready", data: result.data as T, error: undefined };
  }
  return { ...state, reload };
}
