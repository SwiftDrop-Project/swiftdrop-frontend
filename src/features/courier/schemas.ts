import { z } from "zod";
import { personName } from "@/lib/validation";
import { FAILURE_REASON_VALUES } from "./lib/labels";

/*
 * Same rules and messages as the backend (API.md "Validation rules (courier)", StatusChangeRequest.java,
 * CourierDeliveryService.java). The backend trims note and recipientName, so we do too. Change them together.
 */

export const COURIER_MESSAGES = {
  note: "Keep the note under 500 characters.",
  noteOther: "Describe what went wrong.",
  recipientName: "Enter the name of the person who received the parcel.",
  failureReason: "Select why the delivery failed.",
} as const;

export const NOTE_MAX_LENGTH = 500;

const note = z.string().trim().max(NOTE_MAX_LENGTH, COURIER_MESSAGES.note);

/** Confirm dialog for PICKED_UP, IN_TRANSIT and OUT_FOR_DELIVERY: an optional note. */
export const statusStepSchema = z.object({ note });

/** Mark as delivered: who received it (2-100 chars) and an optional note. */
export const markDeliveredSchema = z.object({
  recipientName: personName(COURIER_MESSAGES.recipientName),
  note,
});

/** Mark as failed: a reason, and a note of 3-500 chars when the reason is OTHER. */
export const markFailedSchema = z
  .object({
    // A plain string while editing (the select starts empty), the enum once valid.
    failureReason: z.string().pipe(z.enum(FAILURE_REASON_VALUES, { error: COURIER_MESSAGES.failureReason })),
    note,
  })
  .refine((values) => values.failureReason !== "OTHER" || values.note.length >= 3, {
    path: ["note"],
    message: COURIER_MESSAGES.noteOther,
  });

/** The API treats an empty note as no note; leave it out of the request. */
export function optionalNote(value: string): string | undefined {
  return value === "" ? undefined : value;
}

export type StatusStepValues = z.input<typeof statusStepSchema>;
export type MarkDeliveredValues = z.input<typeof markDeliveredSchema>;
export type MarkFailedInput = z.input<typeof markFailedSchema>;
export type MarkFailedValues = z.output<typeof markFailedSchema>;
