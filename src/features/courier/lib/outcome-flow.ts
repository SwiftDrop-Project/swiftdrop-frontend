import { formatTrackingNumber } from "@/lib/format";
import { courierApi } from "../api";
import type { AssignmentType, CourierTaskDetail, CourierTaskItem, ItemOutcomeRequest, RecordableOutcome } from "../types";
import { COURIER_ERROR_TITLE, describeCourierError } from "./errors";

/*
 * Recording what happened to one parcel (POST .../items/{parcelId}/outcome). Which outcomes a parcel offers always
 * comes from the API (item.allowedOutcomes); this file only picks the form for an outcome, words it, and turns the
 * answer into what the screen should do.
 */

/** confirm: an optional note. not-taken: why (+ note). delivered: who received it. failed: why it failed. */
export type OutcomeFormKind = "confirm" | "not-taken" | "delivered" | "failed";

export const OUTCOME_FORM_KIND: Record<RecordableOutcome, OutcomeFormKind> = {
  COLLECTED: "confirm",
  LOADED: "confirm",
  NOT_COLLECTED: "not-taken",
  NOT_LOADED: "not-taken",
  DELIVERED: "delivered",
  FAILED: "failed",
};

/** Words for the dialog of one outcome on one parcel. */
export function outcomeDialogText(
  outcome: RecordableOutcome,
  item: Pick<CourierTaskItem, "trackingNumber" | "contact">,
  taskType: AssignmentType,
): { title: string; description: string; submit: string; success: string } {
  const tracking = formatTrackingNumber(item.trackingNumber);
  const who = item.contact?.name;
  switch (outcome) {
    case "COLLECTED":
      return {
        title: `Collected ${tracking}?`,
        description: `Do this once you have the parcel${who ? ` from ${who}` : ""}. You can't undo it.`,
        submit: "Mark as collected",
        success: `${tracking} marked as collected`,
      };
    case "NOT_COLLECTED":
      return {
        title: `Couldn't collect ${tracking}`,
        description: "Tell the dispatcher why. The parcel goes back to them to plan again.",
        submit: "Save",
        success: `${tracking} marked as not collected`,
      };
    case "LOADED":
      // A delivery's LOADED makes the parcel OUT_FOR_DELIVERY: say so.
      if (taskType === "DELIVERY") {
        return {
          title: `Out for delivery: ${tracking}?`,
          description: `Do this when the parcel is in your vehicle and you're leaving for delivery${who ? ` to ${who}` : ""}. You can't undo it.`,
          submit: "Mark out for delivery",
          success: `${tracking} is out for delivery`,
        };
      }
      return {
        title: `Loaded ${tracking}?`,
        description: "Do this when the parcel is in your vehicle for the trip to the next branch. You can't undo it.",
        submit: "Mark as loaded",
        success: `${tracking} marked as loaded`,
      };
    case "NOT_LOADED":
      if (taskType === "DELIVERY") {
        return {
          title: `Couldn't take out ${tracking}`,
          description: "Tell the dispatcher why. The parcel stays at the branch.",
          submit: "Save",
          success: `${tracking} marked as not taken out`,
        };
      }
      return {
        title: `Couldn't load ${tracking}`,
        description: "Tell the dispatcher why. The parcel stays at the branch.",
        submit: "Save",
        success: `${tracking} marked as not loaded`,
      };
    case "DELIVERED":
      return {
        title: `Delivered ${tracking}`,
        description: "Enter the name of the person who took the parcel. You can't undo it.",
        submit: "Mark as delivered",
        success: `${tracking} delivered`,
      };
    case "FAILED":
      return {
        title: `Delivery failed for ${tracking}`,
        description: "Pick the reason closest to what happened. You'll return the parcel to the branch later.",
        submit: "Mark as failed",
        success: `${tracking} marked as failed`,
      };
  }
}

/**
 * What the screen does when saving an outcome fails:
 * - fields: 400 with field errors → show them under the fields (message as a summary), keep the dialog open
 * - reload: the task or parcel changed (409 TASK_STEP_NOT_ALLOWED, ASSIGNMENT_CHANGED, INVALID_STATUS_TRANSITION,
 *           ASSIGNMENT_CLOSED) → close the dialog, explain, load the task again
 * - gone:   404 → the task isn't the courier's any more → back to today's tasks
 * - retry:  anything else (network, 500, ...) → keep the dialog open with the message, so it can be sent again
 * Nothing was saved in any of these cases.
 */
export type OutcomeFailure =
  | { kind: "fields"; message: string; fieldErrors: Record<string, string> }
  | { kind: "reload"; title: string; message: string }
  | { kind: "gone"; title: string; message: string }
  | { kind: "retry"; title: string; message: string };

export function outcomeFailure(error: unknown): OutcomeFailure {
  const described = describeCourierError(error);
  switch (described.kind) {
    case "validation":
      return { kind: "fields", message: described.message, fieldErrors: described.fieldErrors };
    case "stale":
    case "closed":
    case "not-finished":
      return { kind: "reload", title: COURIER_ERROR_TITLE[described.kind], message: described.message };
    case "not-found":
      return { kind: "gone", title: "This task isn't assigned to you any more", message: described.message };
    default:
      return { kind: "retry", title: "We couldn't save this update", message: described.message };
  }
}

export type OutcomeResult = { ok: true; task: CourierTaskDetail } | { ok: false; failure: OutcomeFailure };

/** Sends one outcome; never throws. On success, `task` is the task as the API has it after the change. */
export async function submitOutcome(
  assignmentId: string,
  parcelId: string,
  body: ItemOutcomeRequest,
): Promise<OutcomeResult> {
  try {
    return { ok: true, task: await courierApi.recordOutcome(assignmentId, parcelId, body) };
  } catch (error) {
    return { ok: false, failure: outcomeFailure(error) };
  }
}
