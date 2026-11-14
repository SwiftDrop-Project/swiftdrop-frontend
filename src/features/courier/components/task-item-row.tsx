import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRs, formatTrackingNumber } from "@/lib/format";
import {
  courierRoutes,
  failureReasonLabel,
  formatWeight,
  OUTCOME_ACTION_LABEL,
  taskProblemLabel,
} from "../lib/labels";
import type { CourierTaskItem, RecordableOutcome } from "../types";
import { ContactDetails } from "./contact-details";
import { OutcomeBadge } from "./task-badges";

/** The outcomes the outcome endpoint takes; anything else in allowedOutcomes has no button of its own. */
function isRecordable(outcome: string): outcome is RecordableOutcome {
  return outcome in OUTCOME_ACTION_LABEL;
}

/**
 * One parcel in a task: tracking number (opens the parcel), its status and its outcome in this task, where it goes,
 * cash to collect, who to meet, what happened so far, and the next steps the API allows. The step buttons are shown
 * disabled until recording updates is built (F2B). Render it inside a <ul>.
 */
export function TaskItemRow({
  item,
  districtName,
}: {
  item: CourierTaskItem;
  districtName: (code: string) => string;
}) {
  const tracking = formatTrackingNumber(item.trackingNumber);
  const steps = item.allowedOutcomes.filter(isRecordable);
  const details = outcomeDetails(item);

  return (
    <li className="flex flex-col gap-4 p-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={courierRoutes.parcel(item.parcelId)}
          className="text-label font-semibold text-grey-900 tabular-nums underline-offset-4 hover:underline"
        >
          {item.sequence}. {tracking}
        </Link>
        <OutcomeBadge outcome={item.outcome} />
        <StatusBadge status={item.parcelStatus} />
        {item.readyForHandover ? (
          <Badge tone="outline" dot={false}>
            Ready to hand over
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 text-body-sm">
        <p className="break-words text-grey-900">
          {item.from.city} → {item.to.city}
        </p>
        <p className="text-grey-600">
          {districtName(item.from.district)} → {districtName(item.to.district)} · {formatWeight(item.weightKg)}
        </p>
        {item.codAmount !== null ? (
          <p className="text-label text-grey-900 tabular-nums">Collect {formatRs(item.codAmount)} in cash</p>
        ) : null}
        {item.instructions ? <p className="break-words text-grey-600">Instructions: {item.instructions}</p> : null}
      </div>

      {item.contact ? <ContactDetails contact={item.contact} districtName={districtName} /> : null}

      {details.length > 0 ? (
        <ul className="flex flex-col gap-0.5 text-body-sm text-grey-600">
          {details.map((line) => (
            <li key={line} className="break-words">
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      {steps.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-label={`Next steps for ${tracking}`}>
          {steps.map((outcome) => (
            <Button key={outcome} variant="secondary" disabled className="w-full sm:w-auto">
              {OUTCOME_ACTION_LABEL[outcome]}
            </Button>
          ))}
        </div>
      ) : null}
    </li>
  );
}

/** Why a parcel wasn't taken or delivered, who received it, who took it at the branch, and the courier's note. */
function outcomeDetails(item: CourierTaskItem): string[] {
  const lines: string[] = [];
  if (item.problem) lines.push(taskProblemLabel(item.problem));
  if (item.failureReason) lines.push(failureReasonLabel(item.failureReason));
  if (item.recipientName) lines.push(`Received by ${item.recipientName}`);
  if (item.receivedBy) lines.push(`Handed to ${item.receivedBy} at the branch`);
  if (item.note) lines.push(`Your note: ${item.note}`);
  return lines;
}
