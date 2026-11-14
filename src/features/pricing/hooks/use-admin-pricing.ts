"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import type { DistrictCode } from "@/types";
import { adminPricingApi } from "../admin-api";
import type { AdminRateCard, DistrictCentre, RouteTable } from "../admin-types";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : UNKNOWN_ERROR;
}

/** The rate card and the district centres for the Zones & Pricing page, loaded together, with a retry. */
export function useAdminPricing() {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<LoadState<{ rateCard: AdminRateCard; districts: DistrictCentre[] }>>({
    status: "loading",
  });

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([adminPricingApi.rateCard(controller.signal), adminPricingApi.districts(controller.signal)])
      .then(([rateCard, districts]) => setState({ status: "ready", data: { rateCard, districts } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = React.useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}

/** GET /admin/pricing/rate-cards: every rate card version, newest first, with a retry. */
export function useRateCardHistory() {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<LoadState<AdminRateCard[]>>({ status: "loading" });

  React.useEffect(() => {
    const controller = new AbortController();
    adminPricingApi
      .rateCards(controller.signal)
      .then((data) => setState({ status: "ready", data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = React.useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}

/** How a request ended, kept with the branch it belongs to, so a slow answer for an old branch is never shown. */
interface Settled {
  key: string;
  state: LoadState<RouteTable>;
}

/** GET /admin/pricing/routes for one branch. It loads again when the branch changes or on retry. */
export function useRouteTable(from: DistrictCode) {
  const [attempt, setAttempt] = React.useState(0);
  const [settled, setSettled] = React.useState<Settled | null>(null);
  const key = `${from}|${attempt}`;

  React.useEffect(() => {
    const controller = new AbortController();
    adminPricingApi
      .routes(from, controller.signal)
      .then((data) => setSettled({ key, state: { status: "ready", data } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "error", message: errorMessage(error) } });
      });
    return () => controller.abort();
  }, [from, key]);

  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);
  const state: LoadState<RouteTable> = settled?.key === key ? settled.state : { status: "loading" };
  return { state, retry };
}
