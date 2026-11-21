import type { BadgeTone } from "@/components/ui/badge";
import type { AssignmentType, CourierDelivery, ItemOutcome } from "../types";
import { isCourierTaskType, ITEM_OUTCOME_LABEL, ITEM_OUTCOME_TONE } from "./labels";

/*
 * The one status a courier sees for a parcel. These are screen words, not backend values. They come from the parcel's
 * step IN ITS TASK (task.outcome), which already records the handover or the return, so an AT_BRANCH parcel is
 * "Handed over" only when this courier handed it over in this pickup, and "Returned to branch" only when this courier
 * returned it in this delivery. The parcel's own life-cycle status (delivery.ParcelStatus) is shown separately.
 */

export interface CourierParcelStatus {
  label: string;
  tone: BadgeTone;
}

const PICKUP_STATUS: Partial<Record<ItemOutcome, CourierParcelStatus>> = {
  PENDING: { label: "Pending pickup", tone: "outline" },
  COLLECTED: { label: "Picked up", tone: "neutral" },
  HANDED_OVER: { label: "Handed over", tone: "success" },
  NOT_COLLECTED: { label: "Not collected", tone: "error" },
};

const DELIVERY_STATUS: Partial<Record<ItemOutcome, CourierParcelStatus>> = {
  PENDING: { label: "Ready for delivery", tone: "outline" },
  LOADED: { label: "Out for delivery", tone: "neutral" },
  DELIVERED: { label: "Delivered", tone: "success" },
  FAILED: { label: "Delivery failed", tone: "error" },
  RETURNED: { label: "Returned to branch", tone: "neutral" },
  NOT_LOADED: { label: "Not taken out", tone: "error" },
};

/** The parcel's step in a pickup or delivery, in the courier's words. A transfer isn't courier work. */
export function courierParcelStatus(type: AssignmentType, outcome: ItemOutcome): CourierParcelStatus {
  if (type === "TRANSFER") return UNSUPPORTED_STATUS;
  const words = type === "PICKUP" ? PICKUP_STATUS[outcome] : DELIVERY_STATUS[outcome];
  return words ?? { label: ITEM_OUTCOME_LABEL[outcome], tone: ITEM_OUTCOME_TONE[outcome] };
}

const UNSUPPORTED_STATUS: CourierParcelStatus = { label: "Branch transfer", tone: "neutral" };

/**
 * Where a parcel is for the courier:
 * - active:      still theirs to work (`completed` false and the task open)
 * - completed:   the backend says they are done with it (`completed`), whatever its sibling parcels are doing
 * - closed:      the task was closed by someone else before this parcel was finished (cancelled by the dispatcher).
 *                Never shown as completed work: the courier didn't finish it.
 * - unsupported: a TRANSFER task. Couriers are given pickups and deliveries only, so a transfer the API sends anyway
 *                is never active or completed courier work and offers no action.
 * Never worked out from the parcel's status (a PICKED_UP or FAILED parcel is still active) or the task's status alone.
 */
export type ParcelPhase = "active" | "completed" | "closed" | "unsupported";

export function parcelPhase(delivery: Pick<CourierDelivery, "completed" | "task">): ParcelPhase {
  if (!isCourierTaskType(delivery.task.type)) return "unsupported";
  if (delivery.completed) return "completed";
  if (delivery.task.status === "COMPLETED" || delivery.task.status === "CANCELLED") return "closed";
  return "active";
}

/**
 * The badge for a parcel: its step, "Cancelled" when its task was cancelled before the courier finished it, or
 * "Branch transfer" for a transfer (not courier work).
 */
export function deliveryStatus(delivery: Pick<CourierDelivery, "completed" | "task">): CourierParcelStatus {
  const phase = parcelPhase(delivery);
  if (phase === "unsupported") return UNSUPPORTED_STATUS;
  if (phase === "closed") {
    return delivery.task.status === "CANCELLED"
      ? { label: "Cancelled", tone: "neutral" }
      : { label: "Closed", tone: "neutral" };
  }
  return courierParcelStatus(delivery.task.type, delivery.task.outcome);
}
