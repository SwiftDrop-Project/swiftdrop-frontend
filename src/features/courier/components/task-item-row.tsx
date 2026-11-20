import Link from "next/link";
import { ArrowRight, Banknote, Check, CircleDot, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRs, formatTrackingNumber } from "@/lib/format";
import {
  courierRoutes,
  failureReasonLabel,
  formatWeight,
  OUTCOME_ACTION_LABEL,
  outcomeActionLabel,
  taskProblemLabel,
} from "../lib/labels";
import { itemNextStep } from "../lib/parcel-status";
import type { AssignmentType, CourierTaskItem, RecordableOutcome } from "../types";
import { ContactDetails } from "./contact-details";
import { ParcelStatusBadge } from "./task-badges";

/** The outcomes the outcome endpoint takes; anything else in allowedOutcomes has no button of its own. */
function isRecordable(outcome: string): outcome is RecordableOutcome {
  return outcome in OUTCOME_ACTION_LABEL;
}

/** The step goes the way the courier hoped (collected, out for delivery, delivered), or records a problem. */
const PROBLEM_STEPS: ReadonlySet<RecordableOutcome> = new Set(["NOT_COLLECTED", "NOT_LOADED", "FAILED"]);

/**
 * One parcel in a task: tracking number (opens the parcel) and its ONE courier status, what to do next, who to meet
 * and where, cash to collect, what happened so far, and one button per next step the API allows (item.allowedOutcomes,
 * in its order). Render it inside a <ul>.
 */
export function TaskItemRow({
  item,
  taskType,
  districtName,
  onStep,
  busy = false,
  readOnly = false,
}: {
  item: CourierTaskItem;
  /** The task's type: it picks the status words ("Pending pickup", "Ready for delivery") and the button words. */
  taskType: AssignmentType;
  districtName: (code: string) => string;
  /** Opens the form for that outcome. Without it the buttons are shown disabled. */
  onStep?: (outcome: RecordableOutcome) => void;
  /** Another update is being saved or the task is reloading: the buttons wait. */
  busy?: boolean;
  /** No buttons at all (a task that isn't courier work). */
  readOnly?: boolean;
}) {
  const tracking = formatTrackingNumber(item.trackingNumber);
  const steps = readOnly ? [] : item.allowedOutcomes.filter(isRecordable);
  const details = outcomeDetails(item);
  const next = readOnly ? null : itemNextStep(taskType, item);
  const contactLabel = taskType === "PICKUP" ? "Collect from (sender)" : "Deliver to (recipient)";

  return (
    <li className="flex flex-col gap-4 p-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href={courierRoutes.parcel(item.parcelId)}
            className="text-label font-semibold text-grey-900 tabular-nums underline-offset-4 hover:underline"
          >
            {item.sequence}. {tracking}
          </Link>
          <ParcelStatusBadge type={taskType} outcome={item.outcome} />
        </div>
        <span className="text-caption text-grey-600 tabular-nums">{formatWeight(item.weightKg)}</span>
      </div>

      {next ? (
        <p className="flex items-center gap-1.5 text-label text-grey-900">
          <ArrowRight className="size-4 shrink-0 text-grey-500" aria-hidden="true" />
          {next}
        </p>
      ) : null}

      {item.codAmount !== null ? (
        <p className="flex items-center gap-2 rounded-md border border-grey-200 bg-grey-50 px-3 py-2 text-label text-grey-900 tabular-nums">
          <Banknote className="size-5 shrink-0 text-grey-700" aria-hidden="true" />
          Collect {formatRs(item.codAmount)} in cash
        </p>
      ) : null}

      {item.contact ? (
        <div className="flex flex-col gap-2 rounded-md border border-grey-200 p-3">
          <p className="flex items-center gap-1.5 text-caption text-grey-600 uppercase">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {contactLabel}
          </p>
          <ContactDetails contact={item.contact} districtName={districtName} />
        </div>
      ) : (
        <p className="flex items-center gap-1.5 break-words text-body-sm text-grey-600">
          <CircleDot className="size-4 shrink-0 text-grey-500" aria-hidden="true" />
          {item.from.city}, {districtName(item.from.district)} → {item.to.city}, {districtName(item.to.district)}
        </p>
      )}

      {item.instructions ? (
        <p className="break-words text-body-sm text-grey-700">
          <span className="text-label text-grey-900">Instructions: </span>
          {item.instructions}
        </p>
      ) : null}

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
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap" aria-label={`Next steps for ${tracking}`}>
          {steps.map((outcome) => (
            <Button
              key={outcome}
              type="button"
              variant="secondary"
              className="h-11 w-full sm:w-auto"
              disabled={!onStep || busy}
              onClick={() => onStep?.(outcome)}
            >
              {PROBLEM_STEPS.has(outcome) ? <X aria-hidden="true" /> : <Check aria-hidden="true" />}
              {outcomeActionLabel(taskType, outcome)}
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
  if (item.problem) lines.push(`Reason: ${taskProblemLabel(item.problem)}`);
  if (item.failureReason) lines.push(`Reason: ${failureReasonLabel(item.failureReason)}`);
  if (item.recipientName) lines.push(`Received by ${item.recipientName}`);
  if (item.receivedBy) lines.push(`Handed to ${item.receivedBy} at the branch`);
  if (item.note) lines.push(`Your note: ${item.note}`);
  return lines;
}
