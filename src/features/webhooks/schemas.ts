import { z } from "zod";
import type { WebhookEventType } from "./types";

/*
 * Same rules and messages as API.md "Validation rules (webhooks)". Whether the address is public (DNS, private
 * networks) can only be checked by the backend; its answer comes back as fieldErrors.url.
 */

export const WEBHOOK_MESSAGES = {
  url: "Enter a full https:// address, like https://shop.example.com/webhooks",
  eventTypesEmpty: "Choose at least one event",
  eventTypesTooMany: "Choose at most 7 events",
} as const;

const HTTPS_URL = /^https:\/\/[^\s/?#]+/i;

export const webhookSchema = z.object({
  url: z.string().trim().min(1, WEBHOOK_MESSAGES.url).max(2048, WEBHOOK_MESSAGES.url).regex(HTTPS_URL, WEBHOOK_MESSAGES.url),
  eventTypes: z
    .array(z.custom<WebhookEventType>())
    .min(1, WEBHOOK_MESSAGES.eventTypesEmpty)
    .max(7, WEBHOOK_MESSAGES.eventTypesTooMany),
});

export type WebhookValues = z.infer<typeof webhookSchema>;
