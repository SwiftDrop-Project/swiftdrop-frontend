import { apiFetch } from "@/lib/api";
import type { FeeEstimate, FeeEstimateRequest } from "./types";

/** Pricing endpoints (API.md "Pricing (WP4)"). */
export const pricingApi = {
  /** POST /pricing/estimate: the fee for a route, weight and size (CUSTOMER or MERCHANT). Nothing is saved. */
  estimate: (body: FeeEstimateRequest, signal?: AbortSignal) =>
    apiFetch<FeeEstimate>("/pricing/estimate", { method: "POST", body, signal }),
};
