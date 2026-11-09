import { apiFetch } from "@/lib/api";
import type { PageResponse } from "@/types";
import type { CreateDeliveryRequest, Delivery, DeliveryDetail, DeliveryListQuery } from "./types";

/** Delivery endpoints (API.md "Deliveries (WP3)"). */
export const deliveryApi = {
  /** POST /deliveries: books a delivery for the logged-in customer; 201 with the new delivery. */
  create: (body: CreateDeliveryRequest) => apiFetch<Delivery>("/deliveries", { method: "POST", body }),

  /** GET /deliveries: the logged-in customer's deliveries, newest first. */
  list: ({ page, size, status }: DeliveryListQuery, signal?: AbortSignal) =>
    apiFetch<PageResponse<Delivery>>("/deliveries", { query: { page, size, status }, signal }),

  /** GET /deliveries/{id}: one of the customer's deliveries with its history. 404 NOT_FOUND when it isn't theirs. */
  get: (id: string, signal?: AbortSignal) =>
    apiFetch<DeliveryDetail>(`/deliveries/${encodeURIComponent(id)}`, { signal }),
};
