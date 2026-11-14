import { apiFetch } from "@/lib/api";
import type { DistrictCode } from "@/types";
import type { AdminRateCard, DistrictCentre, RouteTable } from "./admin-types";
import type { FeeEstimate, FeeEstimateRequest } from "./types";

/* The admin's Zones & Pricing page (API.md "Zones & pricing (admin, WP4)"). ADMIN only, read only. */
export const adminPricingApi = {
  /** The active rate card with its vehicles. */
  rateCard(signal?: AbortSignal) {
    return apiFetch<AdminRateCard>("/admin/pricing/rate-card", { signal });
  },

  /** Every rate card version, newest first, each with its own vehicles. */
  rateCards(signal?: AbortSignal) {
    return apiFetch<AdminRateCard[]>("/admin/pricing/rate-cards", { signal });
  },

  /** All 25 districts (branches) with their centres. */
  districts(signal?: AbortSignal) {
    return apiFetch<DistrictCentre[]>("/admin/pricing/districts", { signal });
  },

  /** Distance and linehaul from one branch to every district. */
  routes(from: DistrictCode, signal?: AbortSignal) {
    return apiFetch<RouteTable>(`/admin/pricing/routes?from=${encodeURIComponent(from)}`, { signal });
  },

  /** The same quote a booking gets, for an admin. Nothing is saved. */
  estimate(body: FeeEstimateRequest, signal?: AbortSignal) {
    return apiFetch<FeeEstimate>("/admin/pricing/estimate", { method: "POST", body, signal });
  },
};
