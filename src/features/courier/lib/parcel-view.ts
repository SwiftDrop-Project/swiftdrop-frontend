import type { CourierDelivery, CourierToday, FailureReason, Place } from "../types";
import { failureReasonLabel, isCourierTaskType, taskProblemLabel } from "./labels";
import { parcelPhase } from "./parcel-status";

/*
 * Display helpers for the courier parcel screens. Words and grouping only: what a courier may do next always comes
 * from the API (nextStatuses, canMarkUnableToCollect) and whether they are done from `completed`, never from here.
 */

export interface TodayGroups {
  /** Active pickups, in the API's order (oldest assignment first). */
  pickups: CourierDelivery[];
  /** Active deliveries, in the API's order. */
  deliveries: CourierDelivery[];
  /** Parcels the courier completed today, newest first (the API's order). */
  completed: CourierDelivery[];
  /** Parcels whose task a dispatcher closed before the courier finished them. Not completed work. */
  closed: CourierDelivery[];
  /** Branch transfers the API sent anyway. Not courier work: counted in a notice, never shown as a card. */
  unsupported: CourierDelivery[];
}

/**
 * Splits GET /courier/deliveries/today by `completed` and the task type (PICKUP or DELIVERY), keeping the API's order
 * inside each group. A TRANSFER never lands in Deliveries or Completed.
 */
export function groupToday(items: CourierDelivery[]): TodayGroups {
  const groups: TodayGroups = { pickups: [], deliveries: [], completed: [], closed: [], unsupported: [] };
  for (const item of items) {
    const phase = parcelPhase(item);
    if (phase === "unsupported") groups.unsupported.push(item);
    else if (phase === "completed") groups.completed.push(item);
    else if (phase === "closed") groups.closed.push(item);
    else if (item.task.type === "PICKUP") groups.pickups.push(item);
    else groups.deliveries.push(item);
  }
  return groups;
}

/**
 * Courier work (pickups and deliveries) and anything else the API sent (a branch transfer), keeping the API's order.
 * Used by the history, whose page numbers stay the backend's.
 */
export function splitCourierWork<T extends Pick<CourierDelivery, "task">>(items: T[]): { courier: T[]; other: T[] } {
  return {
    courier: items.filter((item) => isCourierTaskType(item.task.type)),
    other: items.filter((item) => !isCourierTaskType(item.task.type)),
  };
}

/** A parcel's key in lists: the same parcel can be in two of the courier's tasks (one entry per task). */
export function deliveryKey(delivery: Pick<CourierDelivery, "parcelId" | "task">): string {
  return `${delivery.parcelId}:${delivery.task.assignmentId}`;
}

/**
 * Today's list after a write answered with `updated` (one parcel as it is now): that parcel is replaced in place,
 * and the counts move when it became completed. Only this parcel changes: its sibling parcels in the same task keep
 * their own state. The screen shows this at once and loads today again, so the API's order and counts win.
 */
export function applyParcelUpdate(today: CourierToday, updated: CourierDelivery): CourierToday {
  const index = today.items.findIndex(
    (item) => item.parcelId === updated.parcelId && item.task.assignmentId === updated.task.assignmentId,
  );
  if (index === -1) return today;
  const before = today.items[index];
  const item = pickDelivery(updated);
  const items = today.items.map((existing, position) => (position === index ? item : existing));
  const wasActive = parcelPhase(before) === "active";
  const nowActive = parcelPhase(item) === "active";
  const nowCompleted = parcelPhase(item) === "completed";
  return {
    ...today,
    items,
    toDo: Math.max(0, today.toDo - (wasActive && !nowActive ? 1 : 0)),
    done: today.done + (wasActive && nowCompleted ? 1 : 0),
  };
}

/** The list fields of a parcel (a write answers the detail, with history and proof). */
function pickDelivery(detail: CourierDelivery): CourierDelivery {
  return {
    parcelId: detail.parcelId,
    trackingNumber: detail.trackingNumber,
    status: detail.status,
    stop: detail.stop,
    pickup: detail.pickup,
    recipient: detail.recipient,
    from: detail.from,
    to: detail.to,
    weightKg: detail.weightKg,
    codAmount: detail.codAmount,
    deliveryFee: detail.deliveryFee,
    instructions: detail.instructions,
    assignedAt: detail.assignedAt,
    updatedAt: detail.updatedAt,
    nextStatuses: detail.nextStatuses,
    canMarkUnableToCollect: detail.canMarkUnableToCollect,
    completed: detail.completed,
    completedAt: detail.completedAt,
    proof: detail.proof,
    task: detail.task,
  };
}

export function parcelsText(count: number): string {
  return `${count} ${count === 1 ? "parcel" : "parcels"}`;
}

/** "Kandy, Kandy district" style text for a place, or a fallback when the API sent none. */
export function placeText(place: Place | null, name: (code: string) => string): string {
  if (!place) return "Not given";
  const district = name(place.district);
  return place.city.trim().toLowerCase() === district.trim().toLowerCase() ? place.city : `${place.city}, ${district}`;
}

/** The branch a parcel is handed over at (task.branch), in words. */
export function branchText(code: string | null, name: (code: string) => string): string {
  return code ? `${name(code)} branch` : "the branch";
}

/** The courier's own route for this step: where they start and where they finish, in words. */
export interface AssignedRoute {
  from: string;
  to: string;
}

/**
 * The route of the courier's assigned step (this task's leg), never the parcel's whole journey:
 * - PICKUP: from the sender's place (`from`) to the task's branch (`task.branch`, the pickup's destination branch)
 * - DELIVERY: from the task's branch (`task.branch`, the delivery's origin branch) to the recipient's place (`to`)
 * The branch always comes from the dispatcher's task, never from the sender's or recipient's district, and it is
 * named as a branch ("Gampaha branch"). The API's `from` / `to` stay the parcel's sender and recipient places; this
 * only decides which one belongs to the step. Each history entry carries its own task, so a finished pickup keeps
 * its pickup route even after the parcel was delivered. A transfer (not courier work) keeps the parcel's two places.
 */
export function assignedRoute(
  delivery: Pick<CourierDelivery, "from" | "to" | "task">,
  name: (code: string) => string,
): AssignedRoute {
  const branch = delivery.task.branch ? branchText(delivery.task.branch, name) : "Branch not given";
  switch (delivery.task.type) {
    case "PICKUP":
      return { from: placeText(delivery.from, name), to: branch };
    case "DELIVERY":
      return { from: branch, to: placeText(delivery.to, name) };
    default:
      return { from: placeText(delivery.from, name), to: placeText(delivery.to, name) };
  }
}

/** "Ja-Ela, Gampaha → Gampaha branch": the assigned route on one line. */
export function assignedRouteText(
  delivery: Pick<CourierDelivery, "from" | "to" | "task">,
  name: (code: string) => string,
): string {
  const route = assignedRoute(delivery, name);
  return `${route.from} → ${route.to}`;
}

/**
 * The contact the courier meets for this parcel, if the API sent one (it only does while the step is open): the
 * sender in a pickup, the recipient in a delivery, nobody otherwise. Keyed by the task type, not `stop` (the API's
 * `stop` is DELIVERY for a branch transfer too).
 */
export function deliveryContact(delivery: Pick<CourierDelivery, "pickup" | "recipient" | "task">) {
  if (delivery.task.type === "PICKUP") return delivery.pickup;
  if (delivery.task.type === "DELIVERY") return delivery.recipient;
  return null;
}

/**
 * Whether "Get directions" belongs on this parcel: an active step whose next stop is its contact (collecting from the
 * sender, or loading / delivering to the recipient), and the API sent that contact. Never towards a branch (handover,
 * return): the API has only the branch's district, not a street address, so a link there would mislead. Never on a
 * finished, closed or history entry (no contact is sent for those either).
 */
export function headingToContact(
  delivery: Pick<CourierDelivery, "completed" | "nextStatuses" | "pickup" | "recipient" | "task">,
): boolean {
  if (parcelPhase(delivery) !== "active" || !deliveryContact(delivery)) return false;
  return delivery.nextStatuses.length > 0 && !delivery.nextStatuses.includes("AT_BRANCH");
}

/** "Collect from (sender)" / "Deliver to (recipient)"; just "Contact" for anything that isn't courier work. */
export function contactLabel(delivery: Pick<CourierDelivery, "task">): string {
  if (delivery.task.type === "PICKUP") return "Collect from (sender)";
  if (delivery.task.type === "DELIVERY") return "Deliver to (recipient)";
  return "Contact";
}

/**
 * What the courier does next with this parcel, in plain words, from what the API sent. null when there is nothing
 * left to do (completed or closed).
 */
export function parcelNextStep(
  delivery: Pick<CourierDelivery, "completed" | "nextStatuses" | "canMarkUnableToCollect" | "task">,
  name: (code: string) => string,
): string | null {
  if (parcelPhase(delivery) !== "active") return null;
  const branch = branchText(delivery.task.branch, name);
  const next = delivery.nextStatuses[0];
  switch (next) {
    case "PICKED_UP":
      return "Collect this parcel from the sender.";
    case "AT_BRANCH":
      return delivery.task.type === "DELIVERY"
        ? `Delivery failed: return this parcel to ${branch}.`
        : `Hand this parcel over at ${branch}.`;
    case "OUT_FOR_DELIVERY":
      return `Take this parcel from ${branch} when you leave for delivery.`;
    case "DELIVERED":
    case "FAILED":
      return "Deliver to the recipient, then mark it delivered or failed.";
    default:
      // No status can be set now. The backend still offers Unable to Collect while the parcel hasn't been taken, e.g.
      // when it hasn't reached the branch yet.
      return delivery.canMarkUnableToCollect
        ? `This parcel isn't at ${branch} yet. Wait for it, or use Unable to Collect.`
        : "Nothing to do right now. Your dispatcher may change this parcel.";
  }
}

/**
 * What happened to this parcel in this task: why it wasn't taken, who took it at the branch, who received it and
 * whether the proof photo is attached, or that the dispatcher cancelled it. Only what the API sent; never contacts.
 * When it was completed is shown next to the type on the card, so it isn't repeated here.
 */
export function outcomeDetails(
  delivery: Pick<CourierDelivery, "completed" | "completedAt" | "task"> & {
    failureReason?: FailureReason | null;
    proof?: CourierDelivery["proof"];
  },
): string[] {
  const lines: string[] = [];
  const { task } = delivery;
  if (task.problem) lines.push(`Reason: ${taskProblemLabel(task.problem)}`);
  if (delivery.failureReason) lines.push(`Reason: ${failureReasonLabel(delivery.failureReason)}`);
  if (task.receivedBy) lines.push(`Received at the branch by ${task.receivedBy}`);
  if (delivery.proof?.recipientName) lines.push(`Received by ${delivery.proof.recipientName}`);
  if (delivery.proof?.hasPhoto) lines.push("Proof of delivery photo attached");
  if (parcelPhase(delivery) === "closed") {
    lines.push(
      task.status === "CANCELLED"
        ? "Your dispatcher cancelled this task before you finished this parcel."
        : "This task was closed before you finished this parcel.",
    );
  }
  return lines;
}
