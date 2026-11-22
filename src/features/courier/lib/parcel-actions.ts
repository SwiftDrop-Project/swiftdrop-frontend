import { formatTrackingNumber } from "@/lib/format";
import type { ParcelStatus } from "@/types";
import { courierApi } from "../api";
import type { CourierDelivery, CourierDeliveryDetail, StatusChangeRequest, UnableToCollectRequest } from "../types";
import { COURIER_ERROR_TITLE, describeCourierError } from "./errors";
import { isCourierTaskType, UNABLE_TO_COLLECT_LABEL } from "./labels";
import { branchText, deliveryContact } from "./parcel-view";

/*
 * The courier's actions on ONE parcel. Which actions a parcel offers always comes from the API: one per entry of
 * `nextStatuses` (in its order), plus "Unable to Collect" while `canMarkUnableToCollect`. This file only picks the
 * form for an action, words it, sends it, and turns the answer into what the screen should do. A parcel is completed
 * when the backend's answer says `completed`; nothing here decides that.
 */

/**
 * The form each action needs:
 * - confirm:   PICKED_UP, OUT_FOR_DELIVERY (an optional note)
 * - handover:  AT_BRANCH, a pickup's handover at the branch or a failed delivery's return to it (who received it)
 * - delivered: DELIVERED (the recipient's name)
 * - failed:    FAILED (the reason, a note for Other)
 * - unable:    "Unable to Collect" (the problem, a note for Other); the backend records NOT_COLLECTED or NOT_LOADED
 */
export type ParcelActionKind = "confirm" | "handover" | "delivered" | "failed" | "unable";

export type ParcelAction =
  | { kind: "confirm"; status: "PICKED_UP" | "OUT_FOR_DELIVERY" }
  | { kind: "handover"; status: "AT_BRANCH" }
  | { kind: "delivered"; status: "DELIVERED" }
  | { kind: "failed"; status: "FAILED" }
  | { kind: "unable" };

/**
 * The action for one of the parcel's next statuses; null for a status no pickup or delivery step sets (CREATED, and
 * IN_TRANSIT, which only a branch transfer uses).
 */
export function actionForStatus(status: ParcelStatus): ParcelAction | null {
  switch (status) {
    case "PICKED_UP":
    case "OUT_FOR_DELIVERY":
      return { kind: "confirm", status };
    case "AT_BRANCH":
      return { kind: "handover", status };
    case "DELIVERED":
      return { kind: "delivered", status };
    case "FAILED":
      return { kind: "failed", status };
    default:
      return null;
  }
}

/**
 * Every action the API offers for this parcel now, in its order, with "Unable to Collect" last. None for a task that
 * isn't a pickup or a delivery (a branch transfer is not courier work), whatever the API lists.
 */
export function parcelActions(
  delivery: Pick<CourierDelivery, "nextStatuses" | "canMarkUnableToCollect" | "task">,
): ParcelAction[] {
  if (!isCourierTaskType(delivery.task.type)) return [];
  const actions = delivery.nextStatuses
    .map(actionForStatus)
    .filter((action): action is ParcelAction => action !== null);
  if (delivery.canMarkUnableToCollect) actions.push({ kind: "unable" });
  return actions;
}

/** An action that records a problem (failed, unable to collect), rather than the step going as hoped. */
export function isProblemAction(action: ParcelAction): boolean {
  return action.kind === "failed" || action.kind === "unable";
}

/** A stable id for an action ("status:AT_BRANCH", "unable"), e.g. for React keys and dialog keys. */
export function actionId(action: ParcelAction): string {
  return action.kind === "unable" ? "unable" : `status:${action.status}`;
}

/** The button words. AT_BRANCH is a handover (pickup, transfer) or a return (a failed delivery). */
export function actionLabel(action: ParcelAction, delivery: Pick<CourierDelivery, "task">): string {
  switch (action.kind) {
    case "unable":
      return UNABLE_TO_COLLECT_LABEL;
    case "handover":
      return delivery.task.type === "PICKUP" ? "Hand over at branch" : "Return to branch";
    // Short card labels (the form that opens says "Mark as delivered" / "Mark as failed" in full).
    case "delivered":
      return "Delivered";
    case "failed":
      return "Failed";
    case "confirm":
      return CONFIRM_LABEL[action.status];
  }
}

/**
 * Short button labels on the parcel cards, so two buttons fit side by side on narrower cards. The form that opens
 * keeps the full wording on its own submit button ("Mark as picked up", "Mark out for delivery").
 */
const CONFIRM_LABEL: Record<"PICKED_UP" | "OUT_FOR_DELIVERY", string> = {
  PICKED_UP: "Mark picked up",
  OUT_FOR_DELIVERY: "Out for delivery",
};

export interface ActionDialogText {
  title: string;
  description: string;
  submit: string;
  success: string;
}

/** Words for the dialog of one action on one parcel. */
export function actionDialogText(
  action: ParcelAction,
  delivery: Pick<CourierDelivery, "trackingNumber" | "stop" | "pickup" | "recipient" | "task">,
  name: (code: string) => string,
): ActionDialogText {
  const tracking = formatTrackingNumber(delivery.trackingNumber);
  const who = deliveryContact(delivery)?.name;
  const branch = branchText(delivery.task.branch, name);
  switch (action.kind) {
    case "confirm":
      if (action.status === "PICKED_UP") {
        return {
          title: `Picked up ${tracking}?`,
          description: `Do this once you have the parcel${who ? ` from ${who}` : ""}. Then hand it over at ${branch}. You can't undo it.`,
          submit: "Mark as picked up",
          success: `${tracking} picked up. Hand it over at ${branch} to finish it.`,
        };
      }
      return {
        title: `Out for delivery: ${tracking}?`,
        description: `Do this when the parcel is in your vehicle and you're leaving for delivery${who ? ` to ${who}` : ""}. You can't undo it.`,
        submit: "Mark out for delivery",
        success: `${tracking} is out for delivery`,
      };
    case "handover":
      return delivery.task.type !== "PICKUP"
        ? {
            title: `Return ${tracking} to ${branch}`,
            description: `Give the parcel to the staff at ${branch}. It waits there for a new delivery; it is not delivered. This finishes the parcel for you.`,
            submit: "Return to branch",
            success: `${tracking} returned to ${branch}`,
          }
        : {
            title: `Hand over ${tracking} at ${branch}`,
            description: `Give the parcel to the staff at ${branch}. It continues its journey from there. This finishes the parcel for you.`,
            submit: "Hand over",
            success: `${tracking} handed over at ${branch}`,
          };
    case "delivered":
      return {
        title: `Delivered ${tracking}`,
        description:
          "Ask the recipient to sign the delivery slip on the parcel, then take a photo of it and enter their name. You can't undo it.",
        submit: "Confirm delivery",
        success: `${tracking} delivered`,
      };
    case "failed":
      return {
        title: `Delivery failed for ${tracking}`,
        description: `Pick the reason closest to what happened. Then return the parcel to ${branch} to finish it.`,
        submit: "Mark as failed",
        success: `${tracking} marked as failed. Return it to ${branch} to finish it.`,
      };
    case "unable":
      return delivery.task.type === "PICKUP"
        ? {
            title: `Unable to collect ${tracking}`,
            description: "Tell the dispatcher why you couldn't take the parcel. It goes back to them to plan again.",
            submit: "Save",
            success: `${tracking} marked as not collected`,
          }
        : {
            title: `Unable to collect ${tracking}`,
            description: `Tell the dispatcher why you couldn't take the parcel. It stays at ${branch} and goes back to them to plan again.`,
            submit: "Save",
            success: `${tracking} marked as not taken`,
          };
  }
}

/**
 * What the screen does when an action fails:
 * - fields: 400 with field errors → show them under the fields (message as a summary), keep the dialog open
 * - reload: the parcel or its task changed (409 TASK_STEP_NOT_ALLOWED, INVALID_STATUS_TRANSITION, ASSIGNMENT_CLOSED,
 *           ASSIGNMENT_CHANGED) → close the dialog, explain, load the parcel (and today's list) again
 * - gone:   404 → the parcel isn't the courier's any more → back to today's parcels
 * - retry:  anything else (network, 500, 503, ...) → keep the dialog open with the message, so it can be sent again
 * Nothing was saved in any of these cases.
 */
export type ActionFailure =
  | { kind: "fields"; message: string; fieldErrors: Record<string, string> }
  | { kind: "reload"; title: string; message: string }
  | { kind: "gone"; title: string; message: string }
  | { kind: "retry"; title: string; message: string };

export function actionFailure(error: unknown): ActionFailure {
  const described = describeCourierError(error);
  switch (described.kind) {
    case "validation":
      return { kind: "fields", message: described.message, fieldErrors: described.fieldErrors };
    case "stale":
    case "closed":
    case "changed":
      return { kind: "reload", title: COURIER_ERROR_TITLE[described.kind], message: described.message };
    case "not-found":
      return { kind: "gone", title: "This parcel isn't assigned to you any more", message: described.message };
    default:
      return { kind: "retry", title: "We couldn't save this update", message: described.message };
  }
}

export type ActionResult = { ok: true; delivery: CourierDeliveryDetail } | { ok: false; failure: ActionFailure };

/** Sends a status change; never throws. On success, `delivery` is the parcel as the API has it after the change. */
export async function submitStatus(parcelId: string, body: StatusChangeRequest): Promise<ActionResult> {
  try {
    return { ok: true, delivery: await courierApi.changeStatus(parcelId, body) };
  } catch (error) {
    return { ok: false, failure: actionFailure(error) };
  }
}

/** A proof photo already stored for this parcel, and the chosen file it came from (so a retry can reuse it). */
export interface UploadedProof {
  file: Blob;
  proofPhotoId: string;
}

export type DeliveredResult =
  | { ok: true; delivery: CourierDeliveryDetail }
  | { ok: false; failure: ActionFailure; uploaded: UploadedProof | null };

/**
 * Mark as delivered with proof: uploads the photo of the signed slip (unless {@code uploaded} is already the photo of
 * this same file), then sends DELIVERED with its proofPhotoId; never throws.
 * - The upload fails: nothing is delivered; the failure says why (a photo problem is a `fields` failure on `file`).
 * - DELIVERED fails after a successful upload: `uploaded` comes back so a retry reuses it, unless the backend refused
 *   the photo itself (`proofPhotoId`), which then has to be uploaded again.
 */
export async function submitDelivered(
  parcelId: string,
  photo: { original: Blob; prepared: Blob; fileName: string },
  body: (proofPhotoId: string) => StatusChangeRequest,
  uploaded: UploadedProof | null,
): Promise<DeliveredResult> {
  let proof = uploaded && uploaded.file === photo.original ? uploaded : null;
  if (!proof) {
    try {
      const stored = await courierApi.uploadProof(parcelId, photo.prepared, photo.fileName);
      proof = { file: photo.original, proofPhotoId: stored.proofPhotoId };
    } catch (error) {
      return { ok: false, failure: actionFailure(error), uploaded: null };
    }
  }
  const result = await submitStatus(parcelId, body(proof.proofPhotoId));
  if (result.ok) return result;
  const photoRefused = result.failure.kind === "fields" && "proofPhotoId" in result.failure.fieldErrors;
  return { ok: false, failure: result.failure, uploaded: photoRefused ? null : proof };
}

/** Sends "Unable to Collect"; never throws. */
export async function submitUnableToCollect(parcelId: string, body: UnableToCollectRequest): Promise<ActionResult> {
  try {
    return { ok: true, delivery: await courierApi.unableToCollect(parcelId, body) };
  } catch (error) {
    return { ok: false, failure: actionFailure(error) };
  }
}
