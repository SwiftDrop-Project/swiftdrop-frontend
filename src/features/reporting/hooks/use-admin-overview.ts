"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import { reportingApi } from "../api";
import type { AdminOverview } from "../types";

export type AdminOverviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AdminOverview; loadedAt: Date };

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

/**
 * Loads GET /admin/reports/overview. `reload` loads it again; while it reloads, the previous figures stay on screen
 * (`refreshing` is true) so the page doesn't jump.
 */
export function useAdminOverview() {
  const [state, setState] = React.useState<AdminOverviewState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    reportingApi
      .overview(controller.signal)
      .then((data) => setState({ status: "ready", data, loadedAt: new Date() }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: isApiError(error) ? error.message : UNKNOWN_ERROR });
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = React.useCallback(() => {
    setRefreshing(true);
    setState((current) => (current.status === "error" ? { status: "loading" } : current));
    setAttempt((value) => value + 1);
  }, []);

  return { state, refreshing, reload };
}
