"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import type { PageResponse } from "@/types";
import { webhooksApi } from "../api";
import type { DeliveryStatus, WebhookDelivery } from "../types";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";
export const DELIVERIES_PAGE_SIZE = 20;
/** How often to look again while a delivery on screen is about to be sent. */
const POLL_MS = 3_000;
/** Only poll for attempts due this soon; a retry 6 hours away doesn't need a request every 3 seconds. */
const POLL_WINDOW_MS = 90_000;

type State =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "ready"; data: PageResponse<WebhookDelivery>; error: undefined }
  | { status: "error"; data: undefined; error: string };

/**
 * One webhook's delivery history. A new filter or page shows the loading state; `reload` and polling keep the rows
 * on screen and swap them when the answer arrives. While a PENDING delivery is due within ~90 seconds (e.g. a test
 * ping just sent), it looks again every 3 seconds, only while the browser tab is visible.
 */
export function useDeliveries(webhookId: string, status: DeliveryStatus | "", page: number) {
  const key = `${webhookId}|${status}|${page}`;
  const [tick, setTick] = React.useState(0);
  const [result, setResult] = React.useState<{ key: string; data?: PageResponse<WebhookDelivery>; error?: string } | null>(
    null,
  );

  React.useEffect(() => {
    const controller = new AbortController();
    webhooksApi
      .deliveries(webhookId, { status: status || undefined, page, size: DELIVERIES_PAGE_SIZE }, controller.signal)
      .then((data) => setResult({ key, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key, error: isApiError(error) ? error.message : UNKNOWN_ERROR });
      });
    return () => controller.abort();
  }, [key, webhookId, status, page, tick]);

  const reload = React.useCallback(() => setTick((value) => value + 1), []);

  const data = result?.key === key ? result.data : undefined;

  // Poll while something on screen is about to be sent.
  React.useEffect(() => {
    if (!data) return undefined;
    const dueSoon = data.content.some(
      (delivery) =>
        delivery.status === "PENDING" &&
        delivery.nextAttemptAt !== null &&
        new Date(delivery.nextAttemptAt).getTime() - Date.now() < POLL_WINDOW_MS,
    );
    if (!dueSoon) return undefined;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.visibilityState === "visible") reload();
      }, POLL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [data, reload]);

  let state: State;
  if (result === null || result.key !== key) {
    state = { status: "loading", data: undefined, error: undefined };
  } else if (result.error !== undefined) {
    state = { status: "error", data: undefined, error: result.error };
  } else {
    state = { status: "ready", data: result.data as PageResponse<WebhookDelivery>, error: undefined };
  }
  return { ...state, reload };
}
