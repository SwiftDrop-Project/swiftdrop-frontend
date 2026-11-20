import type { DistrictCode, ParcelStatus } from "@/types";
import type { AssignmentType, ItemOutcome } from "../types";

/*
 * PREVIEW ONLY. A copy of the backend's step rules, so the sample tasks answer like the real API:
 * - dispatch.ItemOutcome (next, closes)
 * - courier.internal.application.ParcelMoves (allowedOutcomes, readyForHandover, forOutcome)
 * The real screens never use this file: they show what the backend sends. If the backend rules change, change these.
 * Only pickups and deliveries are copied: couriers aren't given branch transfers, so a TRANSFER has no steps here.
 */

/** Life-cycle order (the backend's enum order), used for allowedOutcomes. */
const OUTCOME_ORDER: ItemOutcome[] = [
  "PENDING",
  "COLLECTED",
  "LOADED",
  "HANDED_OVER",
  "DELIVERED",
  "FAILED",
  "RETURNED",
  "NOT_COLLECTED",
  "NOT_LOADED",
];

/** ItemOutcome.next: the outcomes this one may move to in a task of this type. */
export function nextOutcomes(type: AssignmentType, outcome: ItemOutcome): ItemOutcome[] {
  const next: ItemOutcome[] = (() => {
    switch (type) {
      case "PICKUP":
        if (outcome === "PENDING") return ["COLLECTED", "NOT_COLLECTED"];
        if (outcome === "COLLECTED") return ["HANDED_OVER"];
        return [];
      case "TRANSFER":
        // Branch transfers aren't courier work: the preview has none and offers no steps for one.
        return [];
      case "DELIVERY":
        if (outcome === "PENDING") return ["LOADED", "NOT_LOADED"];
        if (outcome === "LOADED") return ["DELIVERED", "FAILED"];
        if (outcome === "FAILED") return ["RETURNED"];
        return [];
    }
  })();
  return OUTCOME_ORDER.filter((candidate) => next.includes(candidate));
}

export function canMoveTo(type: AssignmentType, from: ItemOutcome, to: ItemOutcome): boolean {
  return nextOutcomes(type, from).includes(to);
}

/** ItemOutcome.closes: the courier is done with the parcel in this task. A FAILED delivery stays open until RETURNED. */
export function closes(type: AssignmentType, outcome: ItemOutcome): boolean {
  switch (outcome) {
    case "HANDED_OVER":
      return type === "PICKUP";
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

/** Handover outcomes go through the handover, never the one-parcel outcome endpoint. */
export function isHandover(outcome: ItemOutcome): boolean {
  return outcome === "HANDED_OVER" || outcome === "RETURNED";
}

/** RETURNED for a delivery (failed parcels back to the origin branch), else HANDED_OVER. */
export function handoverOutcome(type: AssignmentType): ItemOutcome {
  return type === "DELIVERY" ? "RETURNED" : "HANDED_OVER";
}

export interface TaskBranches {
  type: AssignmentType;
  originBranch: DistrictCode | null;
  destinationBranch: DistrictCode | null;
}

/** ParcelMoves.forOutcome: the parcel status for an outcome, or null when the parcel doesn't change. */
export function parcelMove(
  task: TaskBranches,
  outcome: ItemOutcome,
): { status: ParcelStatus; branch: DistrictCode | null } | null {
  const { type } = task;
  switch (outcome) {
    case "COLLECTED":
      return type === "PICKUP" ? { status: "PICKED_UP", branch: null } : null;
    case "LOADED":
      if (type === "DELIVERY") return { status: "OUT_FOR_DELIVERY", branch: null };
      return null;
    case "HANDED_OVER":
      return type === "PICKUP" ? { status: "AT_BRANCH", branch: task.destinationBranch } : null;
    case "DELIVERED":
      return type === "DELIVERY" ? { status: "DELIVERED", branch: null } : null;
    case "FAILED":
      return type === "DELIVERY" ? { status: "FAILED", branch: null } : null;
    case "RETURNED":
      return type === "DELIVERY" ? { status: "AT_BRANCH", branch: task.originBranch } : null;
    default:
      return null;
  }
}

/** ParcelMoves.allowedOutcomes: empty once the task is closed; never a handover outcome. */
export function allowedOutcomes(task: TaskBranches, taskClosed: boolean, outcome: ItemOutcome): ItemOutcome[] {
  if (taskClosed) return [];
  return nextOutcomes(task.type, outcome).filter((next) => !isHandover(next));
}

/** ParcelMoves.readyForHandover: can move to the handover outcome, and that move has a branch. */
export function readyForHandover(task: TaskBranches, taskClosed: boolean, outcome: ItemOutcome): boolean {
  if (taskClosed) return false;
  const handover = handoverOutcome(task.type);
  return canMoveTo(task.type, outcome, handover) && parcelMove(task, handover)?.branch != null;
}
