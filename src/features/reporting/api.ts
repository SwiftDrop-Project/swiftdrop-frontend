import { apiFetch } from "@/lib/api";
import type { AdminOverview } from "./types";

/* Admin reports (API.md "Reports (admin, WP4)", role ADMIN only). */
export const reportingApi = {
  /** Account counts, parcels today and in the last 7 days, and the newest accounts. */
  overview(signal?: AbortSignal) {
    return apiFetch<AdminOverview>("/admin/reports/overview", { signal });
  },
};
