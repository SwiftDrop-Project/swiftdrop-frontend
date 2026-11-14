"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import type { PageResponse } from "@/types";
import { deliveryApi } from "../api";
import type { Delivery, DeliveryDetail, DeliveryListQuery } from "../types";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/** One delivery: also "not-found" when it doesn't exist or isn't the customer's (the API answers 404 for both). */
export type DeliveryState = LoadState<DeliveryDetail> | { status: "not-found" };

/**
 * How a request ended, kept with the request it belongs to. When the request changes (another page, status or a
 * retry) the old result no longer matches, so the hook shows "loading" without setting state inside the effect.
 */
interface Settled<S> {
  key: string;
  state: S;
}

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : UNKNOWN_ERROR;
}

/** GET /deliveries for one page and status. A request that is no longer wanted is cancelled. */
export function useDeliveries({ page, size, status }: DeliveryListQuery) {
  const [attempt, setAttempt] = React.useState(0);
  const [settled, setSettled] = React.useState<Settled<LoadState<PageResponse<Delivery>>> | null>(null);
  const key = `${page}|${size}|${status ?? ""}|${attempt}`;

  React.useEffect(() => {
    const controller = new AbortController();
    deliveryApi
      .list({ page, size, status }, controller.signal)
      .then((data) => setSettled({ key, state: { status: "ready", data } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({ key, state: { status: "error", message: errorMessage(error) } });
      });
    return () => controller.abort();
  }, [key, page, size, status]);

  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);
  const state: LoadState<PageResponse<Delivery>> = settled?.key === key ? settled.state : { status: "loading" };
  return { state, retry };
}

/** GET /deliveries/{id}: one of the customer's deliveries with its history. */
export function useDelivery(id: string) {
  const [attempt, setAttempt] = React.useState(0);
  const [settled, setSettled] = React.useState<Settled<DeliveryState> | null>(null);
  const key = `${id}|${attempt}`;

  React.useEffect(() => {
    const controller = new AbortController();
    deliveryApi
      .get(id, controller.signal)
      .then((data) => setSettled({ key, state: { status: "ready", data } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // 404: no such delivery or someone else's; 400: the id in the link isn't a valid id.
        const notFound = isApiError(error) && (error.code === "NOT_FOUND" || error.code === "VALIDATION_FAILED");
        setSettled({
          key,
          state: notFound ? { status: "not-found" } : { status: "error", message: errorMessage(error) },
        });
      });
    return () => controller.abort();
  }, [key, id]);

  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);
  const state: DeliveryState = settled?.key === key ? settled.state : { status: "loading" };
  return { state, retry };
}
