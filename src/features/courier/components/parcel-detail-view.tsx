"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Banknote, CircleAlert, CircleCheck, CircleDashed, CircleDot, MapPin } from "lucide-react";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PARCEL_STATUS_LABEL } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { formatDateTime, formatRs, formatTrackingNumber } from "@/lib/format";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import { ASSIGNMENT_TYPE_LABEL, courierRoutes, failureReasonLabel, formatWeight, taskProblemLabel } from "../lib/labels";
import type { ActionFailure } from "../lib/parcel-actions";
import { parcelPhase } from "../lib/parcel-status";
import { assignedRoute, contactLabel, deliveryContact, headingToContact, parcelNextStep } from "../lib/parcel-view";
import type { CourierDeliveryDetail } from "../types";
import { ContactDetails } from "./contact-details";
import { CopyTrackingNumber } from "./copy-tracking-number";
import { CourierLoadError } from "./courier-load-error";
import { ParcelActionButtons } from "./parcel-action-buttons";
import { ParcelActionDialog, type ParcelActionTarget } from "./parcel-action-dialog";
import { ProofOfDeliveryCard } from "./proof-of-delivery";
import { ParcelStatusBadge, TaskStatusBadge, TaskTypeIcon } from "./task-badges";

type Back = { backHref: string; backLabel: string };

const BACK_TO_TODAY: Back = { backHref: courierRoutes.today, backLabel: "Back to today's parcels" };
const BACK_TO_HISTORY: Back = { backHref: courierRoutes.history, backLabel: "Back to parcel history" };

/** Back to where the courier came from: the history (opened with ?from=history) or today's parcels. */
export function parcelBackLink(from: string | null): Back {
  return from === "history" ? BACK_TO_HISTORY : BACK_TO_TODAY;
}

/**
 * /courier/parcels/[parcelId]: one of the courier's parcels (GET /courier/deliveries/{parcelId}): its open step if it
 * is in one of their open tasks, else the most recently finished one. In order: the header (tracking number, task
 * type, this step's status), the assigned route of this step, what to do next with the actions the API allows, the
 * proof of delivery once delivered, the contact (only while the API sends it), the parcel itself, the task, and the
 * history. Each fact is shown once.
 */
export function CourierParcelView({ parcelId: idProp }: { parcelId?: string }) {
  const params = useParams<{ parcelId?: string }>();
  const parcelId = idProp ?? params.parcelId ?? "";
  const search = useSearchParams();
  const back = parcelBackLink(search.get("from"));
  // A history entry (?task=): that task's finished step, read-only. Never replaced by the parcel's latest step.
  const assignmentId = search.get("task");
  const historical = assignmentId !== null && assignmentId !== "";
  const loaded = useCourierLoad(
    historical ? `courier-history-entry:${parcelId}:${assignmentId}` : `courier-delivery:${parcelId}`,
    (signal) =>
      historical ? courierApi.historyEntry(parcelId, assignmentId, signal) : courierApi.delivery(parcelId, signal),
    { loadingById: true },
  );

  if (loaded.status === "loading") {
    return (
      <DetailPage title="Parcel" {...back}>
        <Card className="p-6" aria-busy="true" aria-label="Loading parcel">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </Card>
      </DetailPage>
    );
  }

  if (loaded.status === "error") {
    return (
      <DetailPage title="Parcel" {...back}>
        <CourierLoadError
          error={loaded.error}
          title={historical ? "We couldn't load this history entry" : "We couldn't load this parcel"}
          notFoundTitle={historical ? "This history entry isn't available" : "This parcel isn't assigned to you"}
          backHref={historical ? courierRoutes.history : courierRoutes.today}
          backLabel={historical ? "Go to parcel history" : "Go to today's parcels"}
          onRetry={loaded.reload}
        />
      </DetailPage>
    );
  }

  return (
    <ParcelReady
      delivery={loaded.data}
      back={back}
      historical={historical}
      refreshing={loaded.refreshing}
      onRefresh={loaded.refresh}
      onReload={loaded.reload}
    />
  );
}

type SummaryTone = "success" | "error" | "neutral";

/**
 * A finished entry in a few words: what happened, then when (or why). Success for a step that went as hoped (handed
 * over, delivered), error for an exception (returned, Unable to Collect), neutral when the dispatcher closed it. The
 * Unable to Collect reason is said here (and not repeated in Assignment).
 */
export function finishedSummary(
  delivery: Pick<CourierDeliveryDetail, "completed" | "completedAt" | "task">,
): { title: string; message: string; tone: SummaryTone } {
  const { task } = delivery;
  const when = delivery.completedAt ? `Completed ${formatDateTime(delivery.completedAt)}` : "";
  if (delivery.completed) {
    switch (task.outcome) {
      case "HANDED_OVER":
        return { title: "Pickup completed", message: when, tone: "success" };
      case "DELIVERED":
        return { title: "Delivery completed", message: when, tone: "success" };
      case "RETURNED":
        return { title: "Returned to branch", message: when, tone: "error" };
      case "NOT_COLLECTED":
      case "NOT_LOADED": {
        const reason = task.problem ? `Reason: ${taskProblemLabel(task.problem)}` : "";
        return { title: "Unable to Collect", message: [reason, when].filter(Boolean).join(" · "), tone: "error" };
      }
      default:
        return { title: "Completed", message: when, tone: "success" };
    }
  }
  return task.status === "CANCELLED"
    ? { title: "Cancelled by dispatcher", message: "Before you finished this parcel.", tone: "neutral" }
    : { title: "Task closed", message: "Closed before you finished this parcel.", tone: "neutral" };
}

const SUMMARY_ICON: Record<SummaryTone, { icon: typeof CircleCheck; className: string }> = {
  success: { icon: CircleCheck, className: "bg-success-tint text-success" },
  error: { icon: CircleAlert, className: "bg-error-tint text-error" },
  neutral: { icon: CircleDashed, className: "bg-grey-50 text-grey-700" },
};

/** The outcome's icon in a tinted tile, the same size as the task type tile it replaces once finished. */
function SummaryIcon({ tone }: { tone: SummaryTone }) {
  const { icon: Icon, className } = SUMMARY_ICON[tone];
  return (
    <span
      aria-hidden="true"
      className={`flex size-10 shrink-0 items-center justify-center rounded-md ${className}`}
    >
      <Icon className="size-5" />
    </span>
  );
}

function ParcelReady({
  delivery,
  back,
  historical,
  refreshing,
  onRefresh,
  onReload,
}: {
  delivery: CourierDeliveryDetail;
  back: Back;
  /**
   * A finished history entry (GET …/history/{assignmentId}): read-only, never any action or form (the API sends
   * none either), history up to when it finished, and the parcel's status labelled as its current one.
   */
  historical: boolean;
  /** The parcel is being loaded again in the background. */
  refreshing: boolean;
  /** Show this parcel (a write's answer) now and load it again. */
  onRefresh: (delivery: CourierDeliveryDetail) => void;
  onReload: () => void;
}) {
  const router = useRouter();
  const districtName = useDistrictName();
  const [target, setTarget] = React.useState<ParcelActionTarget | null>(null);
  const [saving, setSaving] = React.useState(false);
  const busy = refreshing || saving || target !== null;
  const phase = parcelPhase(delivery);
  // Actions only on a live parcel, never on a history entry.
  const actionable = !historical && phase === "active";
  const contact = deliveryContact(delivery);
  const { task } = delivery;

  function saved(updated: CourierDeliveryDetail, message: string) {
    toast({ tone: "success", title: message });
    onRefresh(updated);
  }

  function failed(failure: Extract<ActionFailure, { kind: "reload" | "gone" }>) {
    if (failure.kind === "gone") {
      toast({ tone: "error", title: failure.title, description: failure.message });
      router.replace(courierRoutes.today);
      return;
    }
    // Nothing was saved: show the parcel as it is now, so the courier can look again.
    toast({ tone: "error", title: failure.title, description: `${failure.message} We've loaded the latest version.` });
    onReload();
  }

  const next =
    phase === "unsupported"
      ? {
          title: "Branch transfers aren't courier work",
          message: "This parcel is in a branch transfer, which can't be worked in the courier app. Ask your dispatcher about it.",
        }
      : phase === "active"
        ? { title: "Next step", message: parcelNextStep(delivery, districtName) ?? "" }
        : finishedSummary(delivery);

  const history: TimelineItem[] = delivery.history.map((entry, index) => ({
    id: `${index}-${entry.occurredAt}`,
    title: PARCEL_STATUS_LABEL[entry.status],
    description: entry.branch
      ? `${districtName(entry.branch)} branch`
      : entry.failureReason
        ? failureReasonLabel(entry.failureReason)
        : undefined,
    timestamp: entry.occurredAt,
    tone: entry.status === "DELIVERED" ? "success" : entry.status === "FAILED" ? "error" : "default",
  }));

  const aside = (
    <Card aria-labelledby="parcel-history-heading">
      <CardHeader
        title="History"
        titleId="parcel-history-heading"
        description={historical ? "The parcel's events until this entry was finished, newest first" : "Newest first"}
      />
      <CardContent>
        <Timeline items={history} />
      </CardContent>
    </Card>
  );

  // Shown once each: the step's status in the header, the assigned route in "Your route", the cash reminder in the
  // next step while it applies, the parcel's own status in "Parcel", the whole task's status in "Assignment".
  const route = assignedRoute(delivery, districtName);
  const cashReminder = actionable && delivery.codAmount !== null && task.type === "DELIVERY";

  return (
    <DetailPage
      title={formatTrackingNumber(delivery.trackingNumber)}
      description={ASSIGNMENT_TYPE_LABEL[task.type]}
      status={
        <span className="inline-flex items-center gap-1">
          <ParcelStatusBadge delivery={delivery} />
          <CopyTrackingNumber trackingNumber={delivery.trackingNumber} />
        </span>
      }
      aside={aside}
      {...back}
    >
      <div className="flex flex-col gap-6">
        <Card aria-labelledby="parcel-route-heading">
          <CardHeader
            title="Your route"
            titleId="parcel-route-heading"
            // Guidance only while there is still work to do; a finished entry shows just its route.
            description={
              !actionable
                ? undefined
                : task.type === "PICKUP"
                  ? "Collect from the sender, then hand over at the branch."
                  : "Take from the branch, then deliver to the recipient."
            }
          />
          <CardContent>
            <dl className="flex flex-col gap-3 text-body-sm">
              <div className="flex items-start gap-2">
                <CircleDot className="mt-0.5 size-4 shrink-0 text-grey-500" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-caption text-grey-600">From</dt>
                  <dd className="break-words text-grey-900">{route.from}</dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-grey-500" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-caption text-grey-600">To</dt>
                  <dd className="break-words text-grey-900">{route.to}</dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card aria-labelledby="parcel-next-heading" aria-busy={refreshing}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              {"tone" in next ? <SummaryIcon tone={next.tone} /> : <TaskTypeIcon type={task.type} />}
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id="parcel-next-heading" className="text-h3 text-grey-900">
                  {next.title}
                </h2>
                {refreshing || next.message ? (
                  <p className="text-body-sm text-grey-600 tabular-nums" aria-live="polite">
                    {refreshing ? "Updating…" : next.message}
                  </p>
                ) : null}
              </div>
            </div>
            {cashReminder && delivery.codAmount !== null ? (
              <p className="flex items-center gap-2 rounded-md border border-grey-200 bg-grey-50 px-3 py-2 text-label text-grey-900 tabular-nums">
                <Banknote className="size-5 shrink-0 text-grey-700" aria-hidden="true" />
                Collect {formatRs(delivery.codAmount)} in cash
              </p>
            ) : null}
            {actionable ? (
              <ParcelActionButtons
                delivery={delivery}
                busy={busy}
                onAction={(action) => setTarget({ delivery, action })}
              />
            ) : null}
          </CardContent>
        </Card>

        {phase === "completed" ? <ProofOfDeliveryCard delivery={delivery} /> : null}

        {/*
          The contact only when the API sends it (an open step). A finished, closed or transfer entry gets no contact,
          so no card at all; an active step without one (unusual) still says so.
        */}
        {contact || phase === "active" ? (
          <Card aria-labelledby="parcel-contact-heading">
            <CardHeader title={contactLabel(delivery)} titleId="parcel-contact-heading" />
            <CardContent>
              {contact ? (
                <ContactDetails
                  contact={contact}
                  districtName={districtName}
                  directions={!historical && headingToContact(delivery)}
                />
              ) : (
                <p className="text-body-sm text-grey-600">No contact is needed for this step.</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card aria-labelledby="parcel-where-heading">
          <CardHeader title="Parcel" titleId="parcel-where-heading" />
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
              {/* On a history entry this is where the parcel is now, not what this entry did (that is in the header). */}
              <dt className="text-grey-600">{historical ? "Parcel status now" : "Parcel status"}</dt>
              <dd>{PARCEL_STATUS_LABEL[delivery.status]}</dd>
              <dt className="text-grey-600">Weight</dt>
              <dd className="tabular-nums">{formatWeight(delivery.weightKg)}</dd>
              {/* Not repeated while the next step already asks to collect it. */}
              {delivery.codAmount !== null && !cashReminder ? (
                <>
                  <dt className="text-grey-600">Cash on delivery</dt>
                  <dd className="tabular-nums">{formatRs(delivery.codAmount)}</dd>
                </>
              ) : null}
              {delivery.instructions ? (
                <>
                  <dt className="text-grey-600">Instructions</dt>
                  <dd className="min-w-0 break-words">{delivery.instructions}</dd>
                </>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card aria-labelledby="parcel-task-heading">
          <CardHeader
            title="Assignment"
            titleId="parcel-task-heading"
            description={
              actionable ? "The task your dispatcher gave you. Other parcels in it are worked on their own." : undefined
            }
          />
          <CardContent>
            {/*
              Only what isn't shown above: the type and this parcel's step are in the header, the branch in "Your
              route", the completion time in the next step and the recipient in the proof of delivery. The whole
              task's status stays here: it differs from this parcel's step while other parcels are still open.
            */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
              <dt className="text-grey-600">Task status</dt>
              <dd>
                <TaskStatusBadge status={task.status} />
              </dd>
              <dt className="text-grey-600">Assigned</dt>
              <dd className="tabular-nums">{formatDateTime(delivery.assignedAt)}</dd>
              {/* The Unable to Collect reason is in the summary above. */}
              {delivery.failureReason ? (
                <>
                  <dt className="text-grey-600">Delivery failed</dt>
                  <dd className="min-w-0 break-words">{failureReasonLabel(delivery.failureReason)}</dd>
                </>
              ) : null}
              {task.receivedBy ? (
                <>
                  <dt className="text-grey-600">Received at the branch by</dt>
                  <dd className="min-w-0 break-words">{task.receivedBy}</dd>
                </>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* No form on a history entry: it is read-only. */}
      {historical ? null : (
        <ParcelActionDialog
          target={target}
          districtName={districtName}
          onClose={() => setTarget(null)}
          onSavingChange={setSaving}
          onSaved={saved}
          onFailure={failed}
        />
      )}
    </DetailPage>
  );
}
