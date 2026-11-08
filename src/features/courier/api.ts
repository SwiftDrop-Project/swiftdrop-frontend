import { apiFetch } from "@/lib/api";
import type { PageResponse } from "@/types";
import type {
  CourierDelivery,
  CourierDeliveryDetail,
  CourierToday,
  HistoryQuery,
  StatusChangeRequest,
} from "./types";

const path = (parcelId: string) => `/courier/deliveries/${encodeURIComponent(parcelId)}`;

/* Courier endpoints (API.md "Courier", role COURIER only). */
export const courierApi = {
  /** Every open parcel assigned to the courier, plus the ones finished today. */
  today(signal?: AbortSignal) {
    return apiFetch<CourierToday>("/courier/deliveries/today", { signal });
  },

  /** Parcels this courier delivered or marked failed, newest first. */
  history({ page = 0, size = 20, trackingNumber }: HistoryQuery = {}, signal?: AbortSignal) {
    return apiFetch<PageResponse<CourierDelivery>>("/courier/deliveries/history", {
      query: { page, size, trackingNumber: trackingNumber || undefined },
      signal,
    });
  },

  /** One parcel with its history. 404 when it isn't (or is no longer) assigned to this courier. */
  get(parcelId: string, signal?: AbortSignal) {
    return apiFetch<CourierDeliveryDetail>(path(parcelId), { signal });
  },

  /** Moves the parcel on. 409 INVALID_STATUS_TRANSITION when the step is no longer allowed. */
  changeStatus(parcelId: string, body: StatusChangeRequest) {
    return apiFetch<CourierDeliveryDetail>(`${path(parcelId)}/status`, { method: "POST", body });
  },
};
