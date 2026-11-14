import { courierApi } from "../api";
import type {
  CourierTaskDetail,
  CourierTaskItem,
  CourierTaskSummary,
  HandoverRequest,
  ItemOutcome,
} from "../types";
import { ITEM_OUTCOME_LABEL } from "./labels";
import { outcomeFailure, type OutcomeFailure } from "./outcome-flow";

/*
 * The handover (POST .../handover: HANDED_OVER at the destination branch for PICKUP and TRANSFER, RETURNED to the
 * origin branch for failed DELIVERY parcels) and completing a task (POST .../complete). Which parcels can be handed
 * over and whether the task can be completed always come from the API (item.readyForHandover, task.canComplete).
 */

/** The parcels the API says can be handed over now, in the task's order. */
export function handoverCandidates(task: Pick<CourierTaskDetail, "items">): CourierTaskItem[] {
  return task.items.filter((item) => item.readyForHandover);
}

/** Words for the handover dialog: hand over at the destination, or return failed deliveries to the origin. */
export function handoverText(
  task: Pick<CourierTaskDetail, "type" | "originBranch" | "destinationBranch">,
  name: (code: string) => string,
): { returning: boolean; branch: string; title: string; description: string; submit: string; success: (count: number) => string } {
  const returning = task.type === "DELIVERY";
  const code = returning ? task.originBranch : task.destinationBranch;
  const branch = code ? `${name(code)} branch` : "the branch";
  const parcels = (count: number) => `${count} ${count === 1 ? "parcel" : "parcels"}`;
  return returning
    ? {
        returning,
        branch,
        title: `Return to ${branch}`,
        description: `Return the parcels whose delivery failed to ${branch}. They wait there for a new delivery; they are not delivered.`,
        submit: "Return to branch",
        success: (count) => `${parcels(count)} returned to ${branch}`,
      }
    : {
        returning,
        branch,
        title: `Hand over at ${branch}`,
        description: `Hand the parcels to the staff at ${branch}. They continue their journey from there; handing over doesn't mean they are delivered.`,
        submit: "Hand over",
        success: (count) => `${parcels(count)} handed over at ${branch}`,
      };
}

/** What happened to the task's parcels, for the completion summary: "Handed over: 2", "Not collected: 1". */
export function outcomeSummary(task: Pick<CourierTaskDetail, "items">): { outcome: ItemOutcome; label: string; count: number }[] {
  const counts = new Map<ItemOutcome, number>();
  for (const item of task.items) counts.set(item.outcome, (counts.get(item.outcome) ?? 0) + 1);
  return [...counts.entries()].map(([outcome, count]) => ({ outcome, label: ITEM_OUTCOME_LABEL[outcome], count }));
}

export type HandoverResult = { ok: true; task: CourierTaskDetail } | { ok: false; failure: OutcomeFailure };
export type CompleteResult = { ok: true; task: CourierTaskSummary } | { ok: false; failure: OutcomeFailure };

/**
 * Hands the parcels over (or returns them); never throws. All or nothing: if any listed parcel can't be handed over,
 * the API refuses the whole request (409) and nothing changes, so the screen reloads the task.
 */
export async function submitHandover(assignmentId: string, body: HandoverRequest): Promise<HandoverResult> {
  try {
    return { ok: true, task: await courierApi.handover(assignmentId, body) };
  } catch (error) {
    return { ok: false, failure: outcomeFailure(error) };
  }
}

/**
 * Completes the task; never throws. 409 ASSIGNMENT_NOT_FINISHED (a parcel is still open) and the other 409s reload the
 * task. Completing changes no parcel status.
 */
export async function submitComplete(assignmentId: string): Promise<CompleteResult> {
  try {
    return { ok: true, task: await courierApi.complete(assignmentId) };
  } catch (error) {
    return { ok: false, failure: outcomeFailure(error) };
  }
}
