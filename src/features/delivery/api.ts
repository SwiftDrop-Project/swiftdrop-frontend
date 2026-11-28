import { apiFetch, apiUrl } from "@/lib/api";
import type { PageResponse } from "@/types";
import type { CreateDeliveryRequest, Delivery, DeliveryDetail, DeliveryListQuery, DeliveryReceipt } from "./types";

/** Delivery endpoints (API.md "Deliveries (WP3)"). */
export const deliveryApi = {
  /** POST /deliveries: books a delivery for the logged-in customer; 201 with the new delivery. */
  create: (body: CreateDeliveryRequest) => apiFetch<Delivery>("/deliveries", { method: "POST", body }),

  /**
   * GET /deliveries: the logged-in customer's deliveries, newest first. Several statuses go as a repeated `status`
   * (the "Active" tab); `q` searches the tracking number.
   */
  list: ({ page, size, status, q }: DeliveryListQuery, signal?: AbortSignal) =>
    apiFetch<PageResponse<Delivery>>("/deliveries", { query: { page, size, status, q: q || undefined }, signal }),

  /** GET /deliveries/{id}: one of the customer's deliveries with its history. 404 NOT_FOUND when it isn't theirs. */
  get: (id: string, signal?: AbortSignal) =>
    apiFetch<DeliveryDetail>(`/deliveries/${encodeURIComponent(id)}`, { signal }),

  /** GET /deliveries/{id}/receipt: the receipt of one of the customer's deliveries. 404 NOT_FOUND when not theirs. */
  receipt: (id: string, signal?: AbortSignal) =>
    apiFetch<DeliveryReceipt>(`/deliveries/${encodeURIComponent(id)}/receipt`, { signal }),

  /**
   * GET /deliveries/{id}/receipt/pdf, as a link the browser opens itself (it sends the SD_TOKEN cookie). The API
   * answers with Content-Disposition: attachment, so the PDF downloads and the page stays open.
   */
  receiptPdfUrl: (id: string) => apiUrl(`/deliveries/${encodeURIComponent(id)}/receipt/pdf`),
};
