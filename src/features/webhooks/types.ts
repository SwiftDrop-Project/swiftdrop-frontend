/* Types matching the backend webhooks module's DTOs (../swiftdrop-backend/API.md, "Webhooks (WP6)"). */

/** Parcel events a merchant can subscribe to (wire names). `webhook.ping` is only sent by "Send test". */
export type WebhookEventType =
  | "parcel.created"
  | "parcel.picked_up"
  | "parcel.at_branch"
  | "parcel.in_transit"
  | "parcel.out_for_delivery"
  | "parcel.delivered"
  | "parcel.failed";

/** What a delivery carries: a parcel event, or the test ping sent by "Send test". */
export type DeliveryEventType = WebhookEventType | "webhook.ping";

/** A subscription (API.md "Subscription (response)"). Never holds the secret. */
export interface Webhook {
  id: string;
  url: string;
  /** In the order of the event table. */
  eventTypes: WebhookEventType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Create and rotate-secret responses: the only time the plain secret ("whsec_...") is shown. */
export interface WebhookWithSecret extends Webhook {
  secret: string;
}

/** POST /merchant/webhooks */
export interface CreateWebhookRequest {
  url: string;
  eventTypes: WebhookEventType[];
}

/** PATCH /merchant/webhooks/{id}: only the fields sent change. */
export interface UpdateWebhookRequest {
  url?: string;
  eventTypes?: WebhookEventType[];
  active?: boolean;
}

export type DeliveryStatus = "PENDING" | "SUCCEEDED" | "FAILED";

/**
 * The delivery history's filters (API.md "Searching deliveries"); "" means not set. `search` is a tracking number,
 * part of an order number, or a delivery, event or parcel id; `from`/`to` are days like "2026-11-15" (Sri Lankan
 * time, both included).
 */
export interface DeliveryFilterValues {
  status: DeliveryStatus | "";
  eventType: DeliveryEventType | "";
  search: string;
  from: string;
  to: string;
}

/** A delivery (API.md "Delivery (response)"). Returned by POST /merchant/webhooks/{id}/test. */
export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  eventType: DeliveryEventType;
  /** The parcel the event is about, e.g. "SD2611004817". Null for a test ping. */
  trackingNumber: string | null;
  /** The merchant's own order number. Null for a test ping or a parcel without one. */
  merchantOrderRef: string | null;
  status: DeliveryStatus;
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
}
