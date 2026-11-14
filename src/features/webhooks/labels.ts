import type { WebhookEventType } from "./types";

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

/** API.md: a merchant has at most 5 active subscriptions. */
export const MAX_ACTIVE_WEBHOOKS = 5;
