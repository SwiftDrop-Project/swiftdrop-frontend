import type { CourierTaskSummary, TaskCounts } from "../types";

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

/** The task is planned for a later day than `today` (both "yyyy-mm-dd", Sri Lankan days). */
export function isLaterDay(scheduledFor: string, today: string): boolean {
  return scheduledFor > today;
}

export function parcelsText(count: number): string {
  return `${count} ${count === 1 ? "parcel" : "parcels"}`;
}

/** "2 of 3 parcels done", plus "· 1 problem" when some weren't taken or failed. */
export function progressText(counts: TaskCounts): string {
  const done = `${counts.closed} of ${parcelsText(counts.total)} done`;
  if (counts.problems === 0) return done;
  return `${done} · ${counts.problems} ${counts.problems === 1 ? "problem" : "problems"}`;
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
