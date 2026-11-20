import { ArrowLeftRight, PackagePlus, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE, ITEM_OUTCOME_LABEL, ITEM_OUTCOME_TONE } from "../lib/labels";
import { courierParcelStatus } from "../lib/parcel-status";
import type { AssignmentStatus, AssignmentType, ItemOutcome, TaskCounts } from "../types";
import { progressPercent } from "../lib/task-view";

/** Where a task is: dot + word, never orange (same words and tones as the dispatcher's screens). */
export function TaskStatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge tone={ASSIGNMENT_STATUS_TONE[status]}>{ASSIGNMENT_STATUS_LABEL[status]}</Badge>;
}

/** What happened to one parcel in a task, in the dispatcher's words (used where the task type isn't known). */
export function OutcomeBadge({ outcome }: { outcome: ItemOutcome }) {
  return <Badge tone={ITEM_OUTCOME_TONE[outcome]}>{ITEM_OUTCOME_LABEL[outcome]}</Badge>;
}

/** The one status a courier sees for a parcel in a task: "Pending pickup", "Out for delivery", "Returned to branch". */
export function ParcelStatusBadge({ type, outcome }: { type: AssignmentType; outcome: ItemOutcome }) {
  const status = courierParcelStatus(type, outcome);
  return <Badge tone={status.tone}>{status.label}</Badge>;
}

const TYPE_ICON = { PICKUP: PackagePlus, DELIVERY: Truck, TRANSFER: ArrowLeftRight } as const;

/** The task type's icon in a grey tile: a parcel for pickups, a truck for deliveries. */
export function TaskTypeIcon({ type, className }: { type: AssignmentType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-md bg-grey-50 text-grey-700", className)}
    >
      <Icon className="size-5" />
    </span>
  );
}

/** How many of the task's parcels are updated, as a bar. Green once every parcel is updated. */
export function TaskProgressBar({ counts, label, className }: { counts: TaskCounts; label: string; className?: string }) {
  const percent = progressPercent(counts);
  const done = counts.total > 0 && counts.closed === counts.total;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={counts.total}
      aria-valuenow={counts.closed}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-grey-100", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", done ? "bg-success" : "bg-grey-700")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
