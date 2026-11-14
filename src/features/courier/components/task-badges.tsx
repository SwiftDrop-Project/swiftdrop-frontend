import { Badge } from "@/components/ui/badge";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE, ITEM_OUTCOME_LABEL, ITEM_OUTCOME_TONE } from "../lib/labels";
import type { AssignmentStatus, ItemOutcome } from "../types";

/** Where a task is: dot + word, never orange (same words and tones as the dispatcher's screens). */
export function TaskStatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge tone={ASSIGNMENT_STATUS_TONE[status]}>{ASSIGNMENT_STATUS_LABEL[status]}</Badge>;
}

/** What happened to one parcel in a task. */
export function OutcomeBadge({ outcome }: { outcome: ItemOutcome }) {
  return <Badge tone={ITEM_OUTCOME_TONE[outcome]}>{ITEM_OUTCOME_LABEL[outcome]}</Badge>;
}
