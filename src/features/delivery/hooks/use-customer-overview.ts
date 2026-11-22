"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import { deliveryApi } from "../api";
import type { Delivery } from "../types";
import type { LoadState } from "./use-deliveries";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/** How many deliveries the overview lists under "Recent deliveries". */
export const RECENT_DELIVERIES = 5;

/** Everything the customer overview shows, worked out from GET /deliveries. */
export interface CustomerOverviewData {
  /** The newest deliveries, newest first (at most RECENT_DELIVERIES). */
  recent: Delivery[];
  /** Every delivery the customer has booked. */
  total: number;
  /** Not delivered yet: only DELIVERED is final, so FAILED parcels still count as on their way. */
  active: number;
  delivered: number;
  outForDelivery: number;
  /** The most recently delivered parcel, or null before the first one arrives. */
  latestDelivered: Delivery | null;
}

/**
 * The customer overview's figures. There is no summary endpoint, so it asks GET /deliveries three times in parallel
 * and reads `totalElements`: every delivery (with the newest five), the delivered ones (with the latest), and the ones
 * out for delivery. The requests are cancelled when the page goes away or on retry.
 */
export function useCustomerOverview() {
  const [attempt, setAttempt] = React.useState(0);
  const [settled, setSettled] = React.useState<{ attempt: number; state: LoadState<CustomerOverviewData> } | null>(
    null,
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      deliveryApi.list({ page: 0, size: RECENT_DELIVERIES }, signal),
      deliveryApi.list({ page: 0, size: 1, status: "DELIVERED" }, signal),
      deliveryApi.list({ page: 0, size: 1, status: "OUT_FOR_DELIVERY" }, signal),
    ])
      .then(([all, delivered, outForDelivery]) => {
        const data: CustomerOverviewData = {
          recent: all.content,
          total: all.totalElements,
          active: Math.max(all.totalElements - delivered.totalElements, 0),
          delivered: delivered.totalElements,
          outForDelivery: outForDelivery.totalElements,
          latestDelivered: delivered.content[0] ?? null,
        };
        setSettled({ attempt, state: { status: "ready", data } });
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        const message = isApiError(error) ? error.message : UNKNOWN_ERROR;
        setSettled({ attempt, state: { status: "error", message } });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);
  const state: LoadState<CustomerOverviewData> =
    settled?.attempt === attempt ? settled.state : { status: "loading" };
  return { state, retry };
}
