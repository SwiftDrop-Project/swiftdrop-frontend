// Tracking endpoints (API.md "Tracking"), built on apiFetch.
import { apiFetch } from "@/lib/api";
import type { DistrictCode, PageResponse } from "@/types";
import type { IndexedParcel, LiveEvent, ParcelFilters, ParcelStatusCounts, Tracking } from "./types";

function filterQuery(filters: ParcelFilters) {
  return {
    q: filters.q.trim() || undefined,
    district: filters.district || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

export const trackingApi = {
  /** Public. `trackingNumber` in the normalised form (SD2611004817). */
  get: (trackingNumber: string, signal?: AbortSignal) =>
    apiFetch<Tracking>(`/track/${encodeURIComponent(trackingNumber)}`, { signal }),

  /** Dispatchers and admins: the latest changes, newest first. */
  recent: (branch: DistrictCode | undefined, signal?: AbortSignal) =>
    apiFetch<LiveEvent[]>("/tracking/live/recent", { query: { branch }, signal }),

  /** Admins: every parcel's latest status, most recently updated first. */
  adminParcels: (filters: ParcelFilters, page: number, size: number, signal?: AbortSignal) =>
    apiFetch<PageResponse<IndexedParcel>>("/admin/tracking/parcels", {
      query: { ...filterQuery(filters), status: filters.status || undefined, page, size },
      signal,
    }),

  /** Admins: how many parcels match the filters, per status (the status filter is ignored). */
  adminCounts: (filters: ParcelFilters, signal?: AbortSignal) =>
    apiFetch<ParcelStatusCounts>("/admin/tracking/parcels/counts", { query: filterQuery(filters), signal }),
};
