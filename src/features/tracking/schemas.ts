// zod schemas for tracking forms, with the same rules as the API (spaces and case ignored).
import { z } from "zod";
import { normalizeTrackingNumber } from "@/lib/format";

export const TRACKING_NUMBER_PATTERN = /^SD\d{10}$/;

export function isTrackingNumber(value: string): boolean {
  return TRACKING_NUMBER_PATTERN.test(normalizeTrackingNumber(value));
}

export const trackingSearchSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .min(1, "Enter a tracking number, like SD 2611 0048 17.")
    .refine(isTrackingNumber, "A tracking number is SD followed by 10 digits, like SD 2611 0048 17."),
});

export type TrackingSearchValues = z.infer<typeof trackingSearchSchema>;
