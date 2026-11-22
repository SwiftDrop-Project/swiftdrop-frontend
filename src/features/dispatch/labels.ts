import type { BadgeTone } from "@/components/ui/badge";
import { humanizeCode } from "@/lib/format";
import type { AssignmentStatus, AssignmentType, ItemOutcome, TaskProblem } from "./types";

/*
 * Words for dispatch values. Dispatch owns ItemOutcome, so other features (courier) can import these labels
 * from "@/features/dispatch" too.
 */

export const ASSIGNMENT_TYPE_LABEL: Record<AssignmentType, string> = {
  PICKUP: "Pickup",
  TRANSFER: "Transfer",
  DELIVERY: "Delivery",
};

export const ASSIGNMENT_TYPES = Object.keys(ASSIGNMENT_TYPE_LABEL) as AssignmentType[];

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

export const TASK_PROBLEM_LABEL: Record<TaskProblem, string> = {
  SENDER_UNAVAILABLE: "Sender not available",
  PARCEL_NOT_READY: "Parcel not ready",
  PARCEL_MISSING: "Parcel missing",
  PARCEL_DAMAGED: "Parcel damaged",
  ADDRESS_UNREACHABLE: "Address unreachable",
  OTHER: "Other",
};

/** "RECIPIENT_UNAVAILABLE" → "Recipient unavailable". */
export function failureReasonLabel(reason: string): string {
  const words = humanizeCode(reason);
  return words.charAt(0) + words.slice(1).toLowerCase();
}

/** What a courier does in this kind of task, for the create dialog. */
export const ASSIGNMENT_TYPE_HELP: Record<AssignmentType, string> = {
  PICKUP: "Collect the parcels from their senders and hand them over at the branch.",
  TRANSFER: "Take the parcels from this branch to another branch.",
  DELIVERY: "Take the parcels from this branch to their recipients.",
};
