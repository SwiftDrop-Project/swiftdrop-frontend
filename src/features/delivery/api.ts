import { apiFetch } from "@/lib/api";
import type { CreateDeliveryRequest, Delivery } from "./types";

/** Delivery endpoints (API.md "Deliveries (WP3)"). */
export const deliveryApi = {
  /** POST /deliveries: books a delivery for the logged-in customer; 201 with the new delivery. */
  create: (body: CreateDeliveryRequest) => apiFetch<Delivery>("/deliveries", { method: "POST", body }),
};
