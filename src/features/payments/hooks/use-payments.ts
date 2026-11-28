"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import type { PageResponse } from "@/types";
import { paymentsApi } from "../api";
import type { Payment, PaymentSummary } from "../types";

export type PaymentsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: PaymentSummary; page: PageResponse<Payment> };

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/**
 * GET /payments/summary and one page of GET /payments, loaded together so the cards and the list always agree.
 * `reload` fetches both again after a card payment, keeping what is on screen until the new data arrives.
 */
export function usePayments(page: number, size: number) {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<PaymentsState>({ status: "loading" });

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([paymentsApi.summary(controller.signal), paymentsApi.list({ page, size }, controller.signal)])
      .then(([summary, list]) => setState({ status: "ready", summary, page: list }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: isApiError(error) ? error.message : UNKNOWN_ERROR });
      });
    return () => controller.abort();
  }, [page, size, attempt]);

  const reload = React.useCallback(() => setAttempt((value) => value + 1), []);
  return { state, reload };
}
