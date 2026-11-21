"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import type { PageResponse } from "@/types";
import type { DeliveryEventType, DeliveryFilterValues, DeliveryStatus, WebhookDelivery } from "../types";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";
export const DELIVERIES_PAGE_SIZE = 20;
/** How often to look again while a delivery on screen is about to be sent. */
const POLL_MS = 3_000;
/** Only poll for attempts due this soon; a retry 6 hours away doesn't need a request every 3 seconds. */
const POLL_WINDOW_MS = 90_000;

/** The query a delivery list sends; filters that aren't set are left out. */
export interface DeliveryQuery {
  status?: DeliveryStatus;
  eventType?: DeliveryEventType;
  search?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}

/** Loads one page of deliveries, e.g. one webhook's history or the admin list of every merchant's deliveries. */
export type DeliveryLoader<T extends WebhookDelivery> = (
  query: DeliveryQuery,
  signal: AbortSignal,
) => Promise<PageResponse<T>>;

export type DeliveriesState<T extends WebhookDelivery> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "ready"; data: PageResponse<T>; error: undefined }
  | { status: "error"; data: undefined; error: string };

/**
 * A page of webhook deliveries. A new filter or page shows the loading state; `reload` and polling keep the rows on
 * screen and swap them when the answer arrives. While a PENDING delivery is due within ~90 seconds (e.g. a test ping
 * just sent), it looks again every 3 seconds, only while the browser tab is visible.
 * A filter the backend refuses (400) comes back as its field message, e.g. "The end date can't be before the start
 * date."
 *
 * `load` must keep the same identity between renders (wrap it in useCallback); `scope` must change whenever `load`
 * would load something else (e.g. the webhook id, or the admin's merchant filter), so the list shows loading again.
 */
export function useDeliveries<T extends WebhookDelivery>(
  scope: string,
  load: DeliveryLoader<T>,
  filters: DeliveryFilterValues,
  page: number,
) {
  const { status, eventType, search, from, to } = filters;
  const term = search.trim();
  const key = JSON.stringify([scope, status, eventType, term, from, to, page]);
  const [tick, setTick] = React.useState(0);
  const [result, setResult] = React.useState<{ key: string; data?: PageResponse<T>; error?: string } | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    load(
      {
        status: status || undefined,
        eventType: eventType || undefined,
        search: term || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        size: DELIVERIES_PAGE_SIZE,
      },
      controller.signal,
    )
      .then((data) => setResult({ key, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // a refused filter: show what's wrong with it rather than the general message
        const message = isApiError(error)
          ? (Object.values(error.fieldErrors)[0] ?? error.message)
          : UNKNOWN_ERROR;
        setResult({ key, error: message });
      });
    return () => controller.abort();
  }, [key, load, status, eventType, term, from, to, page, tick]);

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

  let state: DeliveriesState<T>;
  if (result === null || result.key !== key) {
    state = { status: "loading", data: undefined, error: undefined };
  } else if (result.error !== undefined) {
    state = { status: "error", data: undefined, error: result.error };
  } else {
    state = { status: "ready", data: result.data as PageResponse<T>, error: undefined };
  }
  return { ...state, reload };
}
