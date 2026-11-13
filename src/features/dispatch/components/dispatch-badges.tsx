import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE, ITEM_OUTCOME_LABEL, ITEM_OUTCOME_TONE } from "../labels";
import type { AssignmentStatus, DispatchParcelStatus, ItemOutcome } from "../types";

/** The parcel status badge, plus "At branch" (grey, in progress), which the shared StatusBadge doesn't have yet. */
export function ParcelStatusBadge({ status }: { status: DispatchParcelStatus }) {
  if (status === "AT_BRANCH") {
    return <Badge tone="neutral">At branch</Badge>;
  }
  return <StatusBadge status={status} />;
}

/** Where a courier task is: dot + word, never orange. */
export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge tone={ASSIGNMENT_STATUS_TONE[status]}>{ASSIGNMENT_STATUS_LABEL[status]}</Badge>;
}

/** What happened to one parcel in a task. */
export function OutcomeBadge({ outcome }: { outcome: ItemOutcome }) {
  return <Badge tone={ITEM_OUTCOME_TONE[outcome]}>{ITEM_OUTCOME_LABEL[outcome]}</Badge>;
}
