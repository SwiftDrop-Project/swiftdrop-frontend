import type { BadgeTone } from "@/components/ui/badge";
import type { DeliveryEventType, DeliveryStatus, WebhookDelivery, WebhookEventType } from "./types";

/* Words for webhook values, in the order of API.md's event table. */

export const WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] = [
  "parcel.created",
  "parcel.picked_up",
  "parcel.at_branch",
  "parcel.in_transit",
  "parcel.out_for_delivery",
  "parcel.delivered",
  "parcel.failed",
];

export const WEBHOOK_EVENT_LABEL: Record<WebhookEventType, string> = {
  "parcel.created": "Order created",
  "parcel.picked_up": "Picked up",
  "parcel.at_branch": "At branch",
  "parcel.in_transit": "In transit",
  "parcel.out_for_delivery": "Out for delivery",
  "parcel.delivered": "Delivered",
  "parcel.failed": "Delivery failed",
};

export const WEBHOOK_EVENT_DESCRIPTION: Record<WebhookEventType, string> = {
  "parcel.created": "A new order was booked.",
  "parcel.picked_up": "The courier collected the parcel from you.",
  "parcel.at_branch": "The parcel arrived at a SwiftDrop branch.",
  "parcel.in_transit": "The parcel is on its way between branches.",
  "parcel.out_for_delivery": "A courier is taking the parcel to the recipient.",
  "parcel.delivered": "The recipient received the parcel.",
  "parcel.failed": "The delivery attempt didn't succeed.",
};

/**
 * Ticked when adding a webhook: the events most shops act on. One webhook with several events is the normal setup
 * (API.md "One subscription per destination"); the merchant can change the selection before saving.
 */
export const DEFAULT_EVENT_TYPES: readonly WebhookEventType[] = [
  "parcel.picked_up",
  "parcel.out_for_delivery",
  "parcel.delivered",
  "parcel.failed",
];

/** API.md: a merchant has at most 5 active subscriptions. */
export const MAX_ACTIVE_WEBHOOKS = 5;

/** API.md "Delivery and retries": 6 attempts in all. */
export const MAX_ATTEMPTS = 6;

export function deliveryEventLabel(type: DeliveryEventType): string {
  return type === "webhook.ping" ? "Test message" : WEBHOOK_EVENT_LABEL[type];
}

/**
 * Choices for the history's event filter: every parcel event (not only the ones selected now, because older
 * deliveries keep the type they were sent with) and the test ping.
 */
export const DELIVERY_EVENT_TYPES: readonly DeliveryEventType[] = [...WEBHOOK_EVENT_TYPES, "webhook.ping"];

export const DELIVERY_STATUSES: readonly DeliveryStatus[] = ["PENDING", "SUCCEEDED", "FAILED"];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
};

/** Never orange: orange is for actions. Pending is grey (still in progress). */
export const DELIVERY_STATUS_TONE: Record<DeliveryStatus, BadgeTone> = {
  PENDING: "neutral",
  SUCCEEDED: "success",
  FAILED: "error",
};

/** Who reads a delivery list: the merchant ("your server") or an admin ("the merchant's server"). */
export type DeliveryAudience = "merchant" | "admin";

const SERVER_WORDS: Record<DeliveryAudience, { Server: string; server: string }> = {
  merchant: { Server: "Your server", server: "your server" },
  admin: { Server: "The merchant's server", server: "the merchant's server" },
};

/**
 * The last attempt in plain words, without technical codes (API.md `lastError`: null, HTTP_<code>, TIMEOUT,
 * CONNECTION_FAILED, URL_NOT_ALLOWED, SUBSCRIPTION_INACTIVE). The merchant's response body is never stored, so only
 * the answer's code is known; it's translated here into what it means. Merchants read "your server", admins read
 * "the merchant's server".
 */
export function lastResult(
  delivery: Pick<WebhookDelivery, "attempts" | "lastStatusCode" | "lastError">,
  audience: DeliveryAudience = "merchant",
): string {
  const { attempts, lastError } = delivery;
  const { Server, server } = SERVER_WORDS[audience];
  if (lastError === null) {
    return attempts === 0 ? "Not sent yet" : `Received by ${server}`;
  }
  if (lastError.startsWith("HTTP_")) return serverAnswer(Number(lastError.slice("HTTP_".length)), audience);
  switch (lastError) {
    case "TIMEOUT":
      return `${Server} didn't reply in time`;
    case "CONNECTION_FAILED":
      return `We couldn't reach ${server}`;
    case "URL_NOT_ALLOWED":
      return "We couldn't safely reach this address";
    case "SUBSCRIPTION_INACTIVE":
      return "Not sent because the webhook was turned off";
    default:
      return "Something went wrong sending it";
  }
}

/** What an HTTP answer from the merchant's server means, in plain words (the number itself isn't shown). */
function serverAnswer(code: number, audience: DeliveryAudience): string {
  const { Server, server } = SERVER_WORDS[audience];
  if (code >= 300 && code < 400) return `${Server} sent the message to a different address`;
  switch (code) {
    case 400:
    case 422:
      return `${Server} didn't accept the message`;
    case 401:
    case 403:
      return `${Server} refused the message (access denied)`;
    case 404:
      return `This address wasn't found on ${server}`;
    case 405:
      return `${Server} doesn't accept messages at this address`;
    case 408:
      return `${Server} didn't reply in time`;
    case 410:
      return `This address no longer exists on ${server}`;
    case 413:
      return `The message was too large for ${server}`;
    case 429:
      return `${Server} asked us to slow down`;
    case 500:
      return `${Server} had a problem handling the message`;
    case 502:
    case 503:
    case 504:
      return `${Server} was unavailable`;
    default:
      if (code >= 500) return `${Server} had a problem handling the message`;
      if (code >= 400) return `${Server} didn't accept the message`;
      return `${Server} gave an unexpected reply`;
  }
}

/** "in 4 min", "in 1 h", "now" (for the next attempt of a PENDING delivery). */
export function timeUntil(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds <= 30) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `in ${hours} h`;
}
