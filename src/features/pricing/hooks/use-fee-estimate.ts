"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import { pricingApi } from "../api";
import type { FeeEstimate, FeeEstimateRequest } from "../types";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

export type FeeEstimateState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; estimate: FeeEstimate };

/** How a request ended, kept with the request it belongs to (the same idea as delivery's useDeliveries). */
interface Settled {
  key: string;
  state: FeeEstimateState;
}

/**
 * POST /pricing/estimate for one parcel. It asks again when the request changes or on retry, and cancels an answer
 * that is no longer wanted. The request is compared as JSON, so a caller may build a new object on every render.
 */
export function useFeeEstimate(request: FeeEstimateRequest) {
  const [attempt, setAttempt] = React.useState(0);
  const [settled, setSettled] = React.useState<Settled | null>(null);
  const body = JSON.stringify(request);
  const key = `${body}|${attempt}`;

  React.useEffect(() => {
    const controller = new AbortController();
    pricingApi
      .estimate(JSON.parse(body) as FeeEstimateRequest, controller.signal)
      .then((estimate) => setSettled({ key, state: { status: "ready", estimate } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({ key, state: { status: "error", message: isApiError(error) ? error.message : UNKNOWN_ERROR } });
      });
    return () => controller.abort();
  }, [key, body]);

  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);
  const state: FeeEstimateState = settled?.key === key ? settled.state : { status: "loading" };
  return { state, retry };
}
