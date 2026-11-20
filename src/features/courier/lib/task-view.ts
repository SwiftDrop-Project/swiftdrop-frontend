import type { CourierTaskDetail, CourierTaskSummary, TaskCounts } from "../types";
import { isCourierTaskType } from "./labels";

/*
 * Display helpers for the courier task screens. Words and grouping only: what a courier may do next always comes from
 * the API (allowedOutcomes, readyForHandover, canComplete), never from here.
 */

export interface TodayGroups {
  inProgress: CourierTaskSummary[];
  assigned: CourierTaskSummary[];
  doneToday: CourierTaskSummary[];
}

/** Splits GET /courier/assignments/today by the status the API sent, keeping the API's order inside each group. */
export function groupTodayTasks(tasks: CourierTaskSummary[]): TodayGroups {
  return {
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS"),
    assigned: tasks.filter((task) => task.status === "ASSIGNED"),
    doneToday: tasks.filter((task) => task.status === "COMPLETED" || task.status === "CANCELLED"),
  };
}

/**
 * Courier work (pickups and deliveries) and anything else the API sent. Couriers aren't given branch transfers; if
 * one arrives anyway it is counted apart, never shown as a pickup or a delivery. Keeps the API's order.
 */
export function splitCourierTasks<T extends Pick<CourierTaskSummary, "type">>(tasks: T[]): { courier: T[]; other: T[] } {
  return {
    courier: tasks.filter((task) => isCourierTaskType(task.type)),
    other: tasks.filter((task) => !isCourierTaskType(task.type)),
  };
}

/** The task is planned for a later day than `today` (both "yyyy-mm-dd", Sri Lankan days). */
export function isLaterDay(scheduledFor: string, today: string): boolean {
  return scheduledFor > today;
}

export function parcelsText(count: number): string {
  return `${count} ${count === 1 ? "parcel" : "parcels"}`;
}

/** "2 of 3 parcels updated", plus "· 1 problem" when some weren't taken or failed. */
export function progressText(counts: TaskCounts): string {
  const done = `${counts.closed} of ${parcelsText(counts.total)} updated`;
  if (counts.problems === 0) return done;
  return `${done} · ${counts.problems} ${counts.problems === 1 ? "problem" : "problems"}`;
}

/** Share of the task's parcels that are updated (closed), 0-100, for the progress bar. */
export function progressPercent(counts: TaskCounts): number {
  return counts.total === 0 ? 0 : Math.round((counts.closed / counts.total) * 100);
}

/** Where the task goes, from its branches. `name` turns a district code into its name. */
export function taskRouteText(
  task: Pick<CourierTaskSummary, "type" | "originBranch" | "destinationBranch">,
  name: (code: string) => string,
): string {
  const branch = (code: string | null) => (code ? `${name(code)} branch` : "the branch");
  switch (task.type) {
    case "PICKUP":
      return `Collect from senders, hand over at ${branch(task.destinationBranch)}`;
    case "TRANSFER":
      return `${branch(task.originBranch)} to ${branch(task.destinationBranch)}`;
    case "DELIVERY":
      return `Deliver to recipients from ${branch(task.originBranch)}`;
  }
}

/**
 * Where the courier starts and ends: a pickup collects at the senders' addresses and ends at its branch; a delivery
 * collects at its branch and ends at the recipients' addresses.
 */
export function taskLocations(
  task: Pick<CourierTaskSummary, "type" | "originBranch" | "destinationBranch" | "counts">,
  name: (code: string) => string,
): { fromLabel: string; from: string; toLabel: string; to: string } {
  const branch = (code: string | null) => (code ? `${name(code)} branch` : "The branch");
  const addresses = (who: string) =>
    task.counts.total === 1 ? `${who}'s address` : `${task.counts.total} ${who.toLowerCase()} addresses`;
  switch (task.type) {
    case "PICKUP":
      return { fromLabel: "Collect from", from: addresses("Sender"), toLabel: "Hand over at", to: branch(task.destinationBranch) };
    case "DELIVERY":
      return { fromLabel: "Collect from", from: branch(task.originBranch), toLabel: "Deliver to", to: addresses("Recipient") };
    case "TRANSFER":
      return { fromLabel: "From", from: branch(task.originBranch), toLabel: "To", to: branch(task.destinationBranch) };
  }
}

/** The one thing to do next on the task page, from what the API sent. */
export function taskNextStep(
  task: Pick<CourierTaskDetail, "type" | "status" | "canComplete" | "originBranch" | "destinationBranch" | "items">,
  name: (code: string) => string,
): { title: string; message: string } {
  const branch = (code: string | null) => (code ? `${name(code)} branch` : "the branch");
  if (task.status === "COMPLETED") {
    return { title: "Task completed", message: "Nothing more to do here. You can find it in your task history." };
  }
  if (task.status === "CANCELLED") {
    return { title: "Task cancelled", message: "The dispatcher cancelled this task. Nothing more to do here." };
  }
  if (task.type === "TRANSFER") {
    return {
      title: "Branch transfers aren't courier work",
      message: "This task can't be worked in the courier app. Ask your dispatcher about it.",
    };
  }
  if (task.canComplete) {
    return { title: "Every parcel is updated", message: "Complete the task to finish. Completing doesn't change where the parcels are." };
  }
  const ready = task.items.filter((item) => item.readyForHandover).length;
  const steps = task.items.filter((item) => item.allowedOutcomes.length > 0).length;
  if (task.type === "PICKUP") {
    if (ready > 0 && steps === 0) {
      return { title: `Hand over at ${branch(task.destinationBranch)}`, message: "Give the collected parcels to the branch staff." };
    }
    return {
      title: "Collect the parcels",
      message: `Mark each parcel collected or not collected, then hand them over at ${branch(task.destinationBranch)}.`,
    };
  }
  if (ready > 0 && steps === 0) {
    return {
      title: `Return to ${branch(task.originBranch)}`,
      message: "Take the parcels whose delivery failed back to the branch.",
    };
  }
  return {
    title: "Deliver the parcels",
    message: `Mark each parcel out for delivery when you leave ${branch(task.originBranch)}, then delivered or failed.`,
  };
}
