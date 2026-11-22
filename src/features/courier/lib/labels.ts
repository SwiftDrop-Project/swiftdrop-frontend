import type { BadgeTone } from "@/components/ui/badge";
import type { AssignmentStatus, AssignmentType, FailureReason, ItemOutcome, TaskProblem } from "../types";

/*
 * Words for the courier screens. The words for dispatch values are the same as in features/dispatch (labels.ts), so
 * a courier and a dispatcher see the same names. Dispatch doesn't export them, so courier keeps its own copy.
 * Only words and routes live here: what a courier may do next always comes from the API.
 */

export const ASSIGNMENT_TYPE_LABEL: Record<AssignmentType, string> = {
  PICKUP: "Pickup",
  TRANSFER: "Transfer",
  DELIVERY: "Delivery",
};

export const ASSIGNMENT_TYPES = Object.keys(ASSIGNMENT_TYPE_LABEL) as AssignmentType[];

/** Courier work is pickups and deliveries only. A TRANSFER the API sends anyway is never shown or worked as one. */
export type CourierTaskType = Extract<AssignmentType, "PICKUP" | "DELIVERY">;

export function isCourierTaskType(type: AssignmentType): type is CourierTaskType {
  return type === "PICKUP" || type === "DELIVERY";
}

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  ASSIGNED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ASSIGNMENT_STATUS_TONE: Record<AssignmentStatus, BadgeTone> = {
  ASSIGNED: "outline",
  IN_PROGRESS: "neutral",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

export const ASSIGNMENT_STATUSES = Object.keys(ASSIGNMENT_STATUS_LABEL) as AssignmentStatus[];

export const ITEM_OUTCOME_LABEL: Record<ItemOutcome, string> = {
  PENDING: "Waiting",
  COLLECTED: "Collected",
  LOADED: "Loaded",
  HANDED_OVER: "Handed over",
  DELIVERED: "Delivered",
  FAILED: "Delivery failed",
  RETURNED: "Returned to branch",
  NOT_COLLECTED: "Not collected",
  NOT_LOADED: "Not loaded",
};

export const ITEM_OUTCOME_TONE: Record<ItemOutcome, BadgeTone> = {
  PENDING: "outline",
  COLLECTED: "neutral",
  LOADED: "neutral",
  HANDED_OVER: "neutral",
  DELIVERED: "success",
  FAILED: "error",
  RETURNED: "neutral",
  NOT_COLLECTED: "error",
  NOT_LOADED: "error",
};

export const ITEM_OUTCOMES = Object.keys(ITEM_OUTCOME_LABEL) as ItemOutcome[];

/** The one action for every "couldn't take this parcel" situation (pickup or delivery). */
export const UNABLE_TO_COLLECT_LABEL = "Unable to Collect";

/** Why a parcel couldn't be taken ("Unable to Collect"), in the backend's order. */
export const TASK_PROBLEM_OPTIONS: { value: TaskProblem; label: string }[] = [
  { value: "SENDER_UNAVAILABLE", label: "Sender not available" },
  { value: "PARCEL_NOT_READY", label: "Parcel not ready" },
  { value: "PARCEL_MISSING", label: "Parcel missing" },
  { value: "PARCEL_DAMAGED", label: "Parcel damaged" },
  { value: "ADDRESS_UNREACHABLE", label: "Address unreachable" },
  { value: "OTHER", label: "Other" },
];

export const TASK_PROBLEM_VALUES = TASK_PROBLEM_OPTIONS.map((option) => option.value) as [
  TaskProblem,
  ...TaskProblem[],
];

/** Why a delivery failed, in the backend's order. */
export const FAILURE_REASON_OPTIONS: { value: FailureReason; label: string }[] = [
  { value: "RECIPIENT_UNAVAILABLE", label: "Recipient not available" },
  { value: "WRONG_ADDRESS", label: "Wrong address" },
  { value: "RECIPIENT_REFUSED", label: "Recipient refused the parcel" },
  { value: "ADDRESS_UNREACHABLE", label: "Couldn't reach the address" },
  { value: "PARCEL_DAMAGED", label: "Parcel damaged" },
  { value: "OTHER", label: "Other" },
];

export const FAILURE_REASON_VALUES = FAILURE_REASON_OPTIONS.map((option) => option.value) as [
  FailureReason,
  ...FailureReason[],
];

export function taskProblemLabel(problem: TaskProblem): string {
  return TASK_PROBLEM_OPTIONS.find((option) => option.value === problem)?.label ?? problem;
}

export function failureReasonLabel(reason: FailureReason): string {
  return FAILURE_REASON_OPTIONS.find((option) => option.value === reason)?.label ?? reason;
}

const weightFormat = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2 });

/** 1.2 → "1.2 kg" */
export function formatWeight(weightKg: number): string {
  return `${weightFormat.format(weightKg)} kg`;
}

/** Courier pages. Every parcel screen is keyed by the parcel id; the dispatcher's task id is never in a URL. */
export const courierRoutes = {
  today: "/courier",
  history: "/courier/history",
  parcel: (parcelId: string) => `/courier/parcels/${encodeURIComponent(parcelId)}`,
};
