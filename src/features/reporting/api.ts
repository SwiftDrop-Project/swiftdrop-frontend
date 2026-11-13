import { apiFetch, apiUrl } from "@/lib/api";
import type { PageResponse } from "@/types";
import type {
  AdminOverview,
  AdminParcel,
  AdminParcelDetail,
  ParcelFilters,
  ParcelStats,
  ParcelTrackingEntry,
} from "./types";

/** The query string for the parcel filters. `status` is repeated once per status, as the backend expects. */
function parcelQuery(filters: ParcelFilters, extra: Record<string, number> = {}): string {
  const params = new URLSearchParams();
  const q = filters.q?.trim();
  if (q) params.set("q", q);
  for (const status of filters.statuses ?? []) params.append("status", status);
  if (filters.pickupDistrict) params.set("pickupDistrict", filters.pickupDistrict);
  if (filters.deliveryDistrict) params.set("deliveryDistrict", filters.deliveryDistrict);
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  if (filters.payment) params.set("payment", filters.payment);
  if (filters.sort) params.set("sort", filters.sort);
  for (const [key, value] of Object.entries(extra)) params.set(key, String(value));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/* Admin reports and the All Parcels page (API.md "Reports (admin, WP4)" and "Parcels (admin, WP4)"). ADMIN only. */
export const reportingApi = {
  /** Account counts, parcels today and in the last 7 days, and the newest accounts. */
  overview(signal?: AbortSignal) {
    return apiFetch<AdminOverview>("/admin/reports/overview", { signal });
  },

  parcelStats(signal?: AbortSignal) {
    return apiFetch<ParcelStats>("/admin/parcels/stats", { signal });
  },

  listParcels(filters: ParcelFilters, page: number, size: number, signal?: AbortSignal) {
    return apiFetch<PageResponse<AdminParcel>>(`/admin/parcels${parcelQuery(filters, { page, size })}`, { signal });
  },

  getParcel(id: string, signal?: AbortSignal) {
    return apiFetch<AdminParcelDetail>(`/admin/parcels/${encodeURIComponent(id)}`, { signal });
  },

  parcelTracking(id: string, signal?: AbortSignal) {
    return apiFetch<ParcelTrackingEntry[]>(`/admin/parcels/${encodeURIComponent(id)}/tracking`, { signal });
  },

  /** A link that downloads the filtered parcels as CSV (the browser sends the login cookie itself). */
  parcelExportUrl(filters: ParcelFilters) {
    return apiUrl(`/admin/parcels/export${parcelQuery(filters)}`);
  },
};
