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
  CourierParcelDetail,
  CourierTaskDetail,
  CourierTaskItem,
  CourierTaskPage,
  CourierTasksToday,
  CourierTaskSummary,
  HandoverRequest,
  ItemOutcomeRequest,
} from "./types";

/*
 * Requests: the same rules and messages as the backend (API.md "Validation rules (courier)",
 * ItemOutcomeRequest.java, HandoverRequest.java, CourierAssignmentService.validate). The backend trims the texts, so
 * the forms do too, and an empty note is left out. Change them together.
 */

export const COURIER_MESSAGES = {
  note: "Keep the note under 500 characters.",
  noteOther: "Describe what went wrong.",
  problem: "Select why you couldn't take the parcel.",
  recipientName: "Enter the name of the person who received the parcel.",
  failureReason: "Select why the delivery failed.",
  parcelIdsMin: "Select at least one parcel.",
  parcelIdsMax: "Hand over at most 100 parcels at a time.",
  parcelIdsUnique: "Select each parcel only once.",
  receivedBy: "Enter the name of the person at the branch who received the parcels.",
  page: "Use a page number of 0 or more.",
  size: "Use a page size from 1 to 100.",
} as const;

export const NOTE_MAX_LENGTH = 500;
export const HANDOVER_MAX_PARCELS = 100;
export const HISTORY_MAX_PAGE_SIZE = 100;
/** A note describing an OTHER problem or failure: 3 characters or more. */
const NOTE_OTHER_MIN_LENGTH = 3;

const note = z.string().trim().max(NOTE_MAX_LENGTH, COURIER_MESSAGES.note);

/** COLLECTED or LOADED: an optional note. */
export const outcomeStepSchema = z.object({ note });

/** NOT_COLLECTED or NOT_LOADED: why (a plain string while the select is empty), and a note when it is OTHER. */
export const notTakenSchema = z
  .object({
    problem: z.string().pipe(z.enum(TASK_PROBLEM_VALUES, { error: COURIER_MESSAGES.problem })),
    note,
  })
  .refine((values) => values.problem !== "OTHER" || values.note.length >= NOTE_OTHER_MIN_LENGTH, {
    path: ["note"],
    message: COURIER_MESSAGES.noteOther,
  });

/** DELIVERED: who received the parcel (2-100 characters). */
export const deliveredSchema = z.object({
  recipientName: personName(COURIER_MESSAGES.recipientName),
  note,
});

/** FAILED: why, and a note when it is OTHER. */
export const failedSchema = z
  .object({
    failureReason: z.string().pipe(z.enum(FAILURE_REASON_VALUES, { error: COURIER_MESSAGES.failureReason })),
    note,
  })
  .refine((values) => values.failureReason !== "OTHER" || values.note.length >= NOTE_OTHER_MIN_LENGTH, {
    path: ["note"],
    message: COURIER_MESSAGES.noteOther,
  });

/** Handover: 1-100 different parcels, who took them at the branch (2-100 characters), an optional note. */
export const handoverSchema = z.object({
  parcelIds: z
    .array(z.string())
    .min(1, COURIER_MESSAGES.parcelIdsMin)
    .max(HANDOVER_MAX_PARCELS, COURIER_MESSAGES.parcelIdsMax)
    .refine((ids) => new Set(ids).size === ids.length, COURIER_MESSAGES.parcelIdsUnique),
  receivedBy: personName(COURIER_MESSAGES.receivedBy),
  note,
});

/** History paging: page 0 or more, size 1-100. */
export const taskHistoryQuerySchema = z.object({
  page: z.number().int().min(0, COURIER_MESSAGES.page),
  size: z.number().int().min(1, COURIER_MESSAGES.size).max(HISTORY_MAX_PAGE_SIZE, COURIER_MESSAGES.size),
});

export type OutcomeStepValues = z.input<typeof outcomeStepSchema>;
export type NotTakenInput = z.input<typeof notTakenSchema>;
export type NotTakenValues = z.output<typeof notTakenSchema>;
export type DeliveredValues = z.input<typeof deliveredSchema>;
export type FailedInput = z.input<typeof failedSchema>;
export type FailedValues = z.output<typeof failedSchema>;
export type HandoverValues = z.input<typeof handoverSchema>;

/** The API treats an empty note as no note; leave it out of the request. */
export function optionalNote(value: string): string | undefined {
  return value === "" ? undefined : value;
}

/*
 * Request bodies from parsed (trimmed) form values. Each outcome sends only its own fields.
 */

export function outcomeStepRequest(
  outcome: "COLLECTED" | "LOADED",
  values: z.output<typeof outcomeStepSchema>,
): ItemOutcomeRequest {
  return { outcome, note: optionalNote(values.note) };
}

export function notTakenRequest(outcome: "NOT_COLLECTED" | "NOT_LOADED", values: NotTakenValues): ItemOutcomeRequest {
  return { outcome, problem: values.problem, note: optionalNote(values.note) };
}

export function deliveredRequest(values: z.output<typeof deliveredSchema>): ItemOutcomeRequest {
  return { outcome: "DELIVERED", recipientName: values.recipientName, note: optionalNote(values.note) };
}

export function failedRequest(values: FailedValues): ItemOutcomeRequest {
  return { outcome: "FAILED", failureReason: values.failureReason, note: optionalNote(values.note) };
}

export function handoverRequest(values: z.output<typeof handoverSchema>): HandoverRequest {
  return { parcelIds: values.parcelIds, receivedBy: values.receivedBy, note: optionalNote(values.note) };
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

const summaryShape = {
  assignmentId: id,
  type: assignmentType,
  status: assignmentStatus,
  originBranch: district.nullable(),
  destinationBranch: district.nullable(),
  scheduledFor: day,
  note: z.string().nullable(),
  assignedAt: instant,
  completedAt: instant.nullable(),
  counts: z.object({ total: count, open: count, closed: count, problems: count }),
  canComplete: z.boolean(),
};

export const courierTaskSummarySchema = z.object(summaryShape) satisfies z.ZodType<CourierTaskSummary>;

export const courierTaskItemSchema = z.object({
  parcelId: id,
  trackingNumber: z.string(),
  sequence: z.number().int(),
  parcelStatus,
  outcome: itemOutcome,
  allowedOutcomes: z.array(itemOutcome),
  readyForHandover: z.boolean(),
  contact: contactSchema.nullable(),
  from: placeSchema,
  to: placeSchema,
  weightKg: z.number(),
  codAmount: z.number().nullable(),
  instructions: z.string().nullable(),
  problem: taskProblem.nullable(),
  failureReason: failureReason.nullable(),
  recipientName: z.string().nullable(),
  receivedBy: z.string().nullable(),
  note: z.string().nullable(),
  updatedAt: instant,
}) satisfies z.ZodType<CourierTaskItem>;

export const courierTaskDetailSchema = z.object({
  ...summaryShape,
  items: z.array(courierTaskItemSchema),
}) satisfies z.ZodType<CourierTaskDetail>;

export const courierTasksTodaySchema = z.object({
  date: day,
  open: count,
  completedToday: count,
  assignments: z.array(courierTaskSummarySchema),
}) satisfies z.ZodType<CourierTasksToday>;

export const courierTaskPageSchema = z.object({
  content: z.array(courierTaskSummarySchema),
  page: count,
  size: count,
  totalElements: count,
  totalPages: count,
}) satisfies z.ZodType<CourierTaskPage>;

export const courierParcelDetailSchema = z.object({
  parcelId: id,
  trackingNumber: z.string(),
  status: parcelStatus,
  currentBranch: district.nullable(),
  from: placeSchema,
  to: placeSchema,
  myItems: z.array(z.object({ assignmentId: id, type: assignmentType, outcome: itemOutcome })),
  contact: contactSchema.nullable(),
  history: z.array(
    z.object({
      status: parcelStatus,
      branch: district.nullable(),
      failureReason: failureReason.nullable(),
      occurredAt: instant,
    }),
  ),
}) satisfies z.ZodType<CourierParcelDetail>;
