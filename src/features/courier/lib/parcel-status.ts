import type { BadgeTone } from "@/components/ui/badge";
import type { AssignmentType, CourierTaskItem, ItemOutcome } from "../types";
import { ITEM_OUTCOME_LABEL, ITEM_OUTCOME_TONE } from "./labels";

/*
 * The one status a courier sees for a parcel in a task. These are screen words, not backend values. They come from
 * the parcel's outcome IN THIS TASK (dispatch.ItemOutcome), which already records the handover or the return, so an
 * AT_BRANCH parcel is "Handed over" only when this courier handed it over in this pickup, and "Returned to branch"
 * only when this courier returned it in this delivery. The parcel's own life-cycle status (delivery.ParcelStatus) is
 * shown on the parcel page, separately.
 */

export interface CourierParcelStatus {
  label: string;
  tone: BadgeTone;
}

const PICKUP_STATUS: Partial<Record<ItemOutcome, CourierParcelStatus>> = {
  PENDING: { label: "Pending pickup", tone: "outline" },
  COLLECTED: { label: "Collected", tone: "neutral" },
  HANDED_OVER: { label: "Handed over", tone: "success" },
  NOT_COLLECTED: { label: "Not collected", tone: "error" },
};

const DELIVERY_STATUS: Partial<Record<ItemOutcome, CourierParcelStatus>> = {
  PENDING: { label: "Ready for delivery", tone: "outline" },
  LOADED: { label: "Out for delivery", tone: "neutral" },
  DELIVERED: { label: "Delivered", tone: "success" },
  FAILED: { label: "Delivery failed", tone: "error" },
  RETURNED: { label: "Returned to branch", tone: "neutral" },
  // The backend lets a courier say they couldn't take a parcel out (it stays at the branch).
  NOT_LOADED: { label: "Not taken out", tone: "error" },
};

/** The parcel's status in a task of this type. A TRANSFER (not courier work) keeps the plain outcome words. */
export function courierParcelStatus(type: AssignmentType, outcome: ItemOutcome): CourierParcelStatus {
  const status = type === "PICKUP" ? PICKUP_STATUS[outcome] : type === "DELIVERY" ? DELIVERY_STATUS[outcome] : undefined;
  return status ?? { label: ITEM_OUTCOME_LABEL[outcome], tone: ITEM_OUTCOME_TONE[outcome] };
}

/**
 * What the courier does next with this parcel, in plain words, from what the API sent (allowedOutcomes,
 * readyForHandover). null when there is nothing left to do.
 */
export function itemNextStep(
  type: AssignmentType,
  item: Pick<CourierTaskItem, "outcome" | "allowedOutcomes" | "readyForHandover">,
): string | null {
  if (type === "TRANSFER") return null;
  if (item.readyForHandover) {
    return type === "DELIVERY" ? "Return this parcel to the branch." : "Ready to hand over at the branch.";
  }
  if (item.allowedOutcomes.length === 0) return null;
  if (type === "PICKUP") return "Collect this parcel from the sender.";
  if (item.outcome === "PENDING") return "Take this parcel from the branch when you leave for delivery.";
  return "Deliver to the recipient, then mark it delivered or failed.";
}
