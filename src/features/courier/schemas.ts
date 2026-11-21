import { z } from "zod";
import { personName } from "@/lib/validation";
import type { ParcelStatus } from "@/types";
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_TYPES,
  FAILURE_REASON_VALUES,
  ITEM_OUTCOMES,
  TASK_PROBLEM_VALUES,
} from "./lib/labels";
import type {
  CourierDelivery,
  CourierDeliveryDetail,
  CourierDeliveryPage,
  CourierToday,
  ProofUpload,
  StatusChangeRequest,
  UnableToCollectRequest,
} from "./types";

/*
 * Requests: the same rules and messages as the backend (API.md "Validation rules (courier)", StatusChangeRequest.java,
 * UnableToCollectRequest.java, CourierDeliveryService.validate). The backend trims the texts, so the forms do too, and
 * an empty note is left out. Change them together.
 */

export const COURIER_MESSAGES = {
  note: "Keep the note under 500 characters.",
  noteOther: "Describe what went wrong.",
  problem: "Select why you couldn't take the parcel.",
  recipientName: "Enter the name of the person who received the parcel.",
  failureReason: "Select why the delivery failed.",
  receivedBy: "Enter the name of the person at the branch who received the parcel.",
  page: "Use a page number of 0 or more.",
  size: "Use a page size from 1 to 100.",
} as const;

export const NOTE_MAX_LENGTH = 500;
export const HISTORY_MAX_PAGE_SIZE = 100;

/*
 * Proof of delivery photo (POST /courier/deliveries/{parcelId}/proof): a photo of the delivery slip the recipient
 * signed. Same limits and words as the backend (ProofImages.java); the backend checks the real type from the bytes.
 */
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROOF_MESSAGES = {
  required: "Add a photo of the signed delivery slip.",
  tooLarge: "Use a photo up to 5 MB.",
  wrongType: "Use a JPEG, PNG or WebP photo.",
  unreadable: "This photo can't be read. Take it again.",
} as const;

/** What's wrong with a chosen proof photo, or null when it can be uploaded. */
export function proofFileError(file: { type: string; size: number } | null): string | null {
  if (!file || file.size === 0) return PROOF_MESSAGES.required;
  if (!(PROOF_TYPES as readonly string[]).includes(file.type)) return PROOF_MESSAGES.wrongType;
  if (file.size > PROOF_MAX_BYTES) return PROOF_MESSAGES.tooLarge;
  return null;
}
/** A note describing an OTHER problem or failure: 3 characters or more. */
const NOTE_OTHER_MIN_LENGTH = 3;

const note = z.string().trim().max(NOTE_MAX_LENGTH, COURIER_MESSAGES.note);

/** PICKED_UP, OUT_FOR_DELIVERY: an optional note. */
export const confirmStepSchema = z.object({ note });

/**
 * AT_BRANCH (a pickup's handover at the branch, or a failed delivery's return to it): who took it at the branch
 * (2-100 characters, trimmed).
 */
export const handoverSchema = z.object({
  receivedBy: personName(COURIER_MESSAGES.receivedBy),
  note,
});

/** DELIVERED: who received the parcel (2-100 characters, trimmed). */
export const deliveredSchema = z.object({
  recipientName: personName(COURIER_MESSAGES.recipientName),
  note,
});

/** FAILED: why (a plain string while the select is empty), and a note when it is OTHER. */
export const failedSchema = z
  .object({
    failureReason: z.string().pipe(z.enum(FAILURE_REASON_VALUES, { error: COURIER_MESSAGES.failureReason })),
    note,
  })
  .refine((values) => values.failureReason !== "OTHER" || values.note.length >= NOTE_OTHER_MIN_LENGTH, {
    path: ["note"],
    message: COURIER_MESSAGES.noteOther,
  });

/** "Unable to Collect": why, and a note when it is OTHER. */
export const unableToCollectSchema = z
  .object({
    problem: z.string().pipe(z.enum(TASK_PROBLEM_VALUES, { error: COURIER_MESSAGES.problem })),
    note,
  })
  .refine((values) => values.problem !== "OTHER" || values.note.length >= NOTE_OTHER_MIN_LENGTH, {
    path: ["note"],
    message: COURIER_MESSAGES.noteOther,
  });

/** History paging: page 0 or more, size 1-100. */
export const historyQuerySchema = z.object({
  page: z.number().int().min(0, COURIER_MESSAGES.page),
  size: z.number().int().min(1, COURIER_MESSAGES.size).max(HISTORY_MAX_PAGE_SIZE, COURIER_MESSAGES.size),
});

export type ConfirmStepValues = z.input<typeof confirmStepSchema>;
export type HandoverValues = z.input<typeof handoverSchema>;
export type DeliveredValues = z.input<typeof deliveredSchema>;
export type FailedInput = z.input<typeof failedSchema>;
export type FailedValues = z.output<typeof failedSchema>;
export type UnableToCollectInput = z.input<typeof unableToCollectSchema>;
export type UnableToCollectValues = z.output<typeof unableToCollectSchema>;

/** The API treats an empty note as no note; leave it out of the request. */
export function optionalNote(value: string): string | undefined {
  return value === "" ? undefined : value;
}

/*
 * Request bodies from parsed (trimmed) form values. Each status sends only its own fields.
 */

export function confirmStepRequest(
  status: "PICKED_UP" | "OUT_FOR_DELIVERY",
  values: z.output<typeof confirmStepSchema>,
): StatusChangeRequest {
  return { status, note: optionalNote(values.note) };
}

export function handoverRequest(values: z.output<typeof handoverSchema>): StatusChangeRequest {
  return { status: "AT_BRANCH", receivedBy: values.receivedBy, note: optionalNote(values.note) };
}

/** DELIVERED with the recipient's name and the proof photo the backend stored for this parcel. */
export function deliveredRequest(values: z.output<typeof deliveredSchema>, proofPhotoId: string): StatusChangeRequest {
  return { status: "DELIVERED", recipientName: values.recipientName, proofPhotoId, note: optionalNote(values.note) };
}

export function failedRequest(values: FailedValues): StatusChangeRequest {
  return { status: "FAILED", failureReason: values.failureReason, note: optionalNote(values.note) };
}

export function unableToCollectRequest(values: UnableToCollectValues): UnableToCollectRequest {
  return { problem: values.problem, note: optionalNote(values.note) };
}

/*
 * Responses: what the courier endpoints answer (courier/internal/dto/*.java). api.ts checks every answer against
 * these, so a changed contract shows up as an error instead of a half-drawn screen. `satisfies` keeps them in step
 * with types.ts. Unknown extra fields are dropped, not refused.
 */

/** Every value, so a new ParcelStatus in src/types fails the build here until it is added. */
const PARCEL_STATUS_SET: Record<ParcelStatus, true> = {
  CREATED: true,
  PICKED_UP: true,
  AT_BRANCH: true,
  IN_TRANSIT: true,
  OUT_FOR_DELIVERY: true,
  DELIVERED: true,
  FAILED: true,
};

const parcelStatus = z.enum(Object.keys(PARCEL_STATUS_SET) as [ParcelStatus, ...ParcelStatus[]]);
// All three backend values, TRANSFER included, so an answer holding a transfer still parses (the screens filter it).
const assignmentType = z.enum(ASSIGNMENT_TYPES as [(typeof ASSIGNMENT_TYPES)[number], ...typeof ASSIGNMENT_TYPES]);
const assignmentStatus = z.enum(
  ASSIGNMENT_STATUSES as [(typeof ASSIGNMENT_STATUSES)[number], ...typeof ASSIGNMENT_STATUSES],
);
const itemOutcome = z.enum(ITEM_OUTCOMES as [(typeof ITEM_OUTCOMES)[number], ...typeof ITEM_OUTCOMES]);
const taskProblem = z.enum(TASK_PROBLEM_VALUES);
const failureReason = z.enum(FAILURE_REASON_VALUES);

const id = z.guid();
const district = z.string().min(1);
const instant = z.iso.datetime({ offset: true });
const day = z.iso.date();
const count = z.number().int().min(0);

const contactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  district,
});

const placeSchema = z.object({ city: z.string(), district });

const taskSchema = z.object({
  assignmentId: id,
  type: assignmentType,
  status: assignmentStatus,
  outcome: itemOutcome,
  branch: district.nullable(),
  problem: taskProblem.nullable(),
  receivedBy: z.string().nullable(),
});

const deliveryShape = {
  parcelId: id,
  trackingNumber: z.string(),
  status: parcelStatus,
  stop: z.enum(["PICKUP", "DELIVERY"]),
  pickup: contactSchema.nullable(),
  recipient: contactSchema.nullable(),
  from: placeSchema.nullable(),
  to: placeSchema.nullable(),
  weightKg: z.number(),
  codAmount: z.number().nullable(),
  instructions: z.string().nullable(),
  assignedAt: instant,
  updatedAt: instant,
  nextStatuses: z.array(parcelStatus),
  canMarkUnableToCollect: z.boolean(),
  completed: z.boolean(),
  completedAt: instant.nullable(),
  proof: z.object({ recipientName: z.string().nullable(), hasPhoto: z.boolean() }).nullable(),
  task: taskSchema,
};

export const courierDeliverySchema = z.object(deliveryShape) satisfies z.ZodType<CourierDelivery>;

export const courierDeliveryDetailSchema = z.object({
  ...deliveryShape,
  history: z.array(
    z.object({
      status: parcelStatus,
      branch: district.nullable(),
      failureReason: failureReason.nullable(),
      occurredAt: instant,
    }),
  ),
  failureReason: failureReason.nullable(),
}) satisfies z.ZodType<CourierDeliveryDetail>;

export const proofUploadSchema = z.object({
  proofPhotoId: id,
  contentType: z.enum(PROOF_TYPES),
  sizeBytes: z.number().int().positive(),
  uploadedAt: instant,
}) satisfies z.ZodType<ProofUpload>;

export const courierTodaySchema = z.object({
  date: day,
  toDo: count,
  done: count,
  items: z.array(courierDeliverySchema),
}) satisfies z.ZodType<CourierToday>;

export const courierDeliveryPageSchema = z.object({
  content: z.array(courierDeliverySchema),
  page: count,
  size: count,
  totalElements: count,
  totalPages: count,
}) satisfies z.ZodType<CourierDeliveryPage>;
