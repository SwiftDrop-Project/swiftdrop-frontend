"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import { reportingApi } from "../api";
import type { ReportRange, ReportSummary } from "../types";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

export type ReportSummaryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ReportSummary };

/**
 * GET /admin/reports/summary for a range. `range` null (an invalid custom range) asks for nothing and keeps what is
 * on screen. While another range loads, the previous report stays on screen (`refreshing` is true), so the page keeps
 * its shape instead of flashing placeholders.
 */
export function useReportSummary(range: ReportRange | null) {
  const [attempt, setAttempt] = React.useState(0);
  const [settled, setSettled] = React.useState<{ key: string; state: ReportSummaryState } | null>(null);
  const key = range ? `${range.from}|${range.to}|${attempt}` : null;

  React.useEffect(() => {
    if (range === null || key === null) return;
    const controller = new AbortController();
    reportingApi
      .summary(range, controller.signal)
      .then((data) => setSettled({ key, state: { status: "ready", data } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({ key, state: { status: "error", message: isApiError(error) ? error.message : UNKNOWN_ERROR } });
      });
    return () => controller.abort();
    // `range` is compared through `key` (its dates), so a new object with the same dates doesn't reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);
  const current = key !== null && settled?.key === key ? settled.state : null;
  const previous = settled?.state.status === "ready" ? settled.state : null;
  const state: ReportSummaryState = current ?? previous ?? { status: "loading" };
  return { state, refreshing: current === null && previous !== null && key !== null, retry };
}
