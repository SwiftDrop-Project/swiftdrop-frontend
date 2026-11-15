import { apiFetch } from "@/lib/api";
import type { PageResponse } from "@/types";
import type {
  CreateWebhookRequest,
  DeliveryEventType,
  DeliveryStatus,
  UpdateWebhookRequest,
  Webhook,
  WebhookDelivery,
  WebhookWithSecret,
} from "./types";

const BASE = "/merchant/webhooks";

function path(id: string, suffix = ""): string {
  return `${BASE}/${encodeURIComponent(id)}${suffix}`;
}

/** The merchant's webhook endpoints (API.md "Webhooks"). Logged-in merchants only (SD_TOKEN cookie). */
export const webhooksApi = {
  /** Active and turned off, newest first. */
  list: (signal?: AbortSignal) => apiFetch<Webhook[]>(BASE, { signal }),

  /** 201 with the secret, shown only this once. */
  create: (body: CreateWebhookRequest) => apiFetch<WebhookWithSecret>(BASE, { method: "POST", body }),

  /** Changes only the fields sent; `{ active: true }` turns it back on. */
  update: (id: string, body: UpdateWebhookRequest) => apiFetch<Webhook>(path(id), { method: "PATCH", body }),

  /** Turns it off (204). Its history is kept. */
  turnOff: (id: string) => apiFetch<void>(path(id), { method: "DELETE" }),

  /** A new secret; the old one stops working at once. */
  rotateSecret: (id: string) => apiFetch<WebhookWithSecret>(path(id, "/rotate-secret"), { method: "POST" }),

  /** Queues a webhook.ping (202), sent within seconds. Works while turned off too. */
  sendTest: (id: string) => apiFetch<WebhookDelivery>(path(id, "/test"), { method: "POST" }),

  /**
   * One webhook's delivery history, newest first. Every filter is optional (left out means all): `status`,
   * `eventType` (a wire name, including `webhook.ping`), `search`, `from` and `to`. size 1-100.
   */
  deliveries: (
    id: string,
    {
      status,
      eventType,
      search,
      from,
      to,
      page,
      size,
    }: {
      status?: DeliveryStatus;
      eventType?: DeliveryEventType;
      /** Tracking number, part of an order number, or a delivery/event/parcel id. */
      search?: string;
      /** First day, "2026-11-01" (Sri Lankan time, included). */
      from?: string;
      /** Last day, "2026-11-15" (Sri Lankan time, included). */
      to?: string;
      page: number;
      size: number;
    },
    signal?: AbortSignal,
  ) =>
    apiFetch<PageResponse<WebhookDelivery>>(path(id, "/deliveries"), {
      query: { status, eventType, search, from, to, page, size },
      signal,
    }),

  /** Sends a FAILED delivery again with a new set of attempts; 409 WEBHOOK_DELIVERY_NOT_RETRYABLE otherwise. */
  retry: (deliveryId: string) =>
    apiFetch<WebhookDelivery>(`${BASE}/deliveries/${encodeURIComponent(deliveryId)}/retry`, { method: "POST" }),
};
