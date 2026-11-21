import type { DistrictCode, ParcelStatus } from "@/types";
import type { AssignmentType, CourierTargetStatus, ItemOutcome } from "../types";

/*
 * PREVIEW ONLY. A copy of the backend's step rules, so the sample parcels answer like the real API:
 * - delivery.ParcelStatus (next)
 * - dispatch.ItemOutcome (next, closes)
 * - courier.internal.application.CourierTask (stepStatuses, nextStatuses, atTheRightBranch, canMarkUnableToCollect,
 *   unableToCollectOutcome, outcomeFor, handOverBranch)
 * The real screens never use this file: they show what the backend sends. If the backend rules change, change these.
 * Only pickups and deliveries are copied: couriers aren't given branch transfers, so a TRANSFER has no steps here.
 */

/** ParcelStatus.next: where a parcel may move from its own status. */
const PARCEL_NEXT: Record<ParcelStatus, ParcelStatus[]> = {
  CREATED: ["PICKED_UP"],
  PICKED_UP: ["AT_BRANCH"],
  AT_BRANCH: ["IN_TRANSIT", "OUT_FOR_DELIVERY"],
  IN_TRANSIT: ["AT_BRANCH"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  FAILED: ["AT_BRANCH"],
  DELIVERED: [],
};

export function parcelCanMoveTo(current: ParcelStatus, target: ParcelStatus): boolean {
  return PARCEL_NEXT[current].includes(target);
}

/** ItemOutcome.next: the outcomes this one may move to in a task of this type. */
export function nextOutcomes(type: AssignmentType, outcome: ItemOutcome): ItemOutcome[] {
  switch (type) {
    case "PICKUP":
      if (outcome === "PENDING") return ["COLLECTED", "NOT_COLLECTED"];
      if (outcome === "COLLECTED") return ["HANDED_OVER"];
      return [];
    case "TRANSFER":
      // Not courier work: the preview has no transfers and offers no steps for one.
      return [];
    case "DELIVERY":
      if (outcome === "PENDING") return ["LOADED", "NOT_LOADED"];
      if (outcome === "LOADED") return ["DELIVERED", "FAILED"];
      if (outcome === "FAILED") return ["RETURNED"];
      return [];
  }
}

/** ItemOutcome.closes: the courier is done with the parcel in this task. COLLECTED, LOADED and FAILED stay open. */
export function closes(type: AssignmentType, outcome: ItemOutcome): boolean {
  switch (outcome) {
    case "HANDED_OVER":
    case "NOT_COLLECTED":
      return type === "PICKUP";
    case "NOT_LOADED":
      return type === "DELIVERY";
    case "DELIVERED":
    case "RETURNED":
      return type === "DELIVERY";
    default:
      return false;
  }
}

/** CourierTask.stepStatuses: the statuses the task's next step moves the parcel to, while the step is open. */
export function stepStatuses(type: AssignmentType, outcome: ItemOutcome, closed: boolean): CourierTargetStatus[] {
  if (closed) return [];
  switch (type) {
    case "PICKUP":
      if (outcome === "PENDING") return ["PICKED_UP"];
      if (outcome === "COLLECTED") return ["AT_BRANCH"];
      return [];
    case "TRANSFER":
      return [];
    case "DELIVERY":
      if (outcome === "PENDING") return ["OUT_FOR_DELIVERY"];
      if (outcome === "LOADED") return ["DELIVERED", "FAILED"];
      if (outcome === "FAILED") return ["AT_BRANCH"];
      return [];
  }
}

/** CourierTask.atTheRightBranch: taking a parcel out (OUT_FOR_DELIVERY) needs it at the task's origin branch. */
export function atTheRightBranch(
  target: ParcelStatus,
  originBranch: DistrictCode | null,
  currentBranch: DistrictCode | null,
): boolean {
  if (target !== "IN_TRANSIT" && target !== "OUT_FOR_DELIVERY") return true;
  return originBranch !== null && originBranch === currentBranch;
}

/** CourierTask.nextStatuses: the step's statuses the parcel's own status allows now, at the right branch. */
export function nextStatuses(
  task: { type: AssignmentType; outcome: ItemOutcome; closed: boolean; originBranch: DistrictCode | null },
  current: ParcelStatus,
  currentBranch: DistrictCode | null,
): CourierTargetStatus[] {
  return stepStatuses(task.type, task.outcome, task.closed).filter(
    (target) => parcelCanMoveTo(current, target) && atTheRightBranch(target, task.originBranch, currentBranch),
  );
}

/** CourierTask.unableToCollectOutcome: NOT_COLLECTED for a pickup, NOT_LOADED for a delivery. */
export function unableToCollectOutcome(type: AssignmentType): ItemOutcome {
  return type === "PICKUP" ? "NOT_COLLECTED" : "NOT_LOADED";
}

/** CourierTask.canMarkUnableToCollect: the step is open and dispatch allows that outcome next. */
export function canMarkUnableToCollect(type: AssignmentType, outcome: ItemOutcome, closed: boolean): boolean {
  return !closed && nextOutcomes(type, outcome).includes(unableToCollectOutcome(type));
}

/** CourierTask.outcomeFor: the task outcome a change to `target` records. */
export function outcomeFor(type: AssignmentType, target: CourierTargetStatus): ItemOutcome {
  switch (target) {
    case "PICKED_UP":
      return "COLLECTED";
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return "LOADED";
    case "AT_BRANCH":
      return type === "DELIVERY" ? "RETURNED" : "HANDED_OVER";
    case "DELIVERED":
      return "DELIVERED";
    case "FAILED":
      return "FAILED";
  }
}

/** CourierTask.handOverBranch: the destination branch, or for a delivery its origin branch (returns go there). */
export function handOverBranch(
  type: AssignmentType,
  originBranch: DistrictCode | null,
  destinationBranch: DistrictCode | null,
): DistrictCode | null {
  return type === "DELIVERY" ? originBranch : destinationBranch;
}
