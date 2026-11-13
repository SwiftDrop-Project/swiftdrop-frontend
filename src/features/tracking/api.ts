// Tracking endpoints (API.md "Tracking"), built on apiFetch.
import { apiFetch } from "@/lib/api";
import type { DistrictCode } from "@/types";
import type { LiveEvent, Tracking } from "./types";

export const trackingApi = {
  /** Public. `trackingNumber` in the normalised form (SD2611004817). */
  get: (trackingNumber: string, signal?: AbortSignal) =>
    apiFetch<Tracking>(`/track/${encodeURIComponent(trackingNumber)}`, { signal }),

  /** Dispatchers and admins: the latest changes, newest first. */
  recent: (branch: DistrictCode | undefined, signal?: AbortSignal) =>
    apiFetch<LiveEvent[]>("/tracking/live/recent", { query: { branch }, signal }),
};
