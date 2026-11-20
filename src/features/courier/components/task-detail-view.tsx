"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Building2, CircleCheck, Undo2 } from "lucide-react";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { formatDate, formatDateTime } from "@/lib/format";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import { courierRoutes, HANDOVER_ACTION_LABEL, isCourierTaskType, taskTitle } from "../lib/labels";
import type { OutcomeFailure } from "../lib/outcome-flow";
import { handoverCandidates } from "../lib/task-actions";
import { parcelsText, progressText, taskLocations, taskNextStep, taskRouteText } from "../lib/task-view";
import type { CourierTaskDetail, CourierTaskSummary } from "../types";
import { CompleteTaskDialog } from "./complete-task-dialog";
import { CourierLoadError } from "./courier-load-error";
import { HandoverDialog } from "./handover-dialog";
import { OutcomeDialog, type OutcomeTarget } from "./outcome-dialog";
import { TaskProgressBar, TaskStatusBadge, TaskTypeIcon } from "./task-badges";
import { TaskItemRow } from "./task-item-row";

type Back = { backHref: string; backLabel: string };

const BACK_TO_TODAY: Back = { backHref: courierRoutes.today, backLabel: "Back to today's tasks" };
const BACK_TO_HISTORY: Back = { backHref: courierRoutes.history, backLabel: "Back to task history" };

/** Back to where the courier came from: the history (opened with ?from=history) or today's tasks. */
export function taskBackLink(from: string | null): Back {
  return from === "history" ? BACK_TO_HISTORY : BACK_TO_TODAY;
}

/**
 * /courier/tasks/[assignmentId]: one of the courier's tasks with its parcels; record outcomes, hand over, complete.
 */
export function CourierTaskView({ assignmentId: idProp }: { assignmentId?: string }) {
  const params = useParams<{ assignmentId?: string }>();
  const assignmentId = idProp ?? params.assignmentId ?? "";
  const BACK = taskBackLink(useSearchParams().get("from"));
  const loaded = useCourierLoad(`courier-task:${assignmentId}`, (signal) => courierApi.task(assignmentId, signal), {
    loadingById: true,
  });

  if (loaded.status === "loading") {
    return (
      <DetailPage title="Task" {...BACK}>
        <Card className="p-6" aria-busy="true" aria-label="Loading task">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </Card>
      </DetailPage>
    );
  }

  if (loaded.status === "error") {
    return (
      <DetailPage title="Task" {...BACK}>
        <CourierLoadError
          error={loaded.error}
          title="We couldn't load this task"
          notFoundTitle="This task isn't assigned to you"
          backHref={courierRoutes.today}
          backLabel="Go to today's tasks"
          onRetry={loaded.reload}
        />
      </DetailPage>
    );
  }

  return (
    <TaskReady
      task={loaded.data}
      back={BACK}
      refreshing={loaded.refreshing}
      onRefresh={loaded.refresh}
      onReload={loaded.reload}
    />
  );
}

function TaskReady({
  task,
  back,
  refreshing,
  onRefresh,
  onReload,
}: {
  task: CourierTaskDetail;
  back: Back;
  /** The task is being loaded again in the background. */
  refreshing: boolean;
  /** Show this task (a write's answer) now and load it again. */
  onRefresh: (task: CourierTaskDetail) => void;
  onReload: () => void;
}) {
  const router = useRouter();
  const districtName = useDistrictName();
  const [target, setTarget] = React.useState<OutcomeTarget | null>(null);
  const [dialog, setDialog] = React.useState<"handover" | "complete" | null>(null);
  const [saving, setSaving] = React.useState(false);
  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";
  // Couriers work pickups and deliveries. A branch transfer is shown read only, never as courier work.
  const courierWork = isCourierTaskType(task.type);
  // The API decides: readyForHandover per parcel, canComplete for the task.
  const readyCount = handoverCandidates(task).length;
  // While anything is open, saving or reloading, every other action waits.
  const busy = refreshing || saving || target !== null || dialog !== null;

  function saved(updated: CourierTaskDetail, message: string) {
    toast({ tone: "success", title: message });
    onRefresh(updated);
  }

  function completed(_summary: CourierTaskSummary, message: string) {
    toast({ tone: "success", title: message });
    // Complete answers the summary only: load the whole task again to show it closed.
    onReload();
  }

  function failed(failure: Extract<OutcomeFailure, { kind: "reload" | "gone" }>) {
    if (failure.kind === "gone") {
      toast({ tone: "error", title: failure.title, description: failure.message });
      router.replace(courierRoutes.today);
      return;
    }
    // Nothing was saved: show the task as it is now, so the courier can look again.
    toast({ tone: "error", title: failure.title, description: `${failure.message} We've loaded the latest version.` });
    onReload();
  }

  const where = taskLocations(task, districtName);
  const next = taskNextStep(task, districtName);
  const progress = progressText(task.counts);
  // Completing is the main action once the API allows it; until then, handing over is.
  const completeIsMain = task.canComplete;

  // Large buttons in the "Next step" card; none on a closed task or on a task that isn't courier work.
  const actions = closed || !courierWork ? null : (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
      <Button
        variant={completeIsMain || readyCount === 0 ? "secondary" : "primary"}
        className="h-11 w-full sm:w-auto"
        disabled={readyCount === 0 || busy}
        onClick={() => setDialog("handover")}
      >
        {task.type === "DELIVERY" ? <Undo2 aria-hidden="true" /> : <Building2 aria-hidden="true" />}
        {HANDOVER_ACTION_LABEL[task.type]}
        {readyCount > 0 ? ` (${readyCount})` : ""}
      </Button>
      <Button
        variant={completeIsMain ? "primary" : "secondary"}
        className="h-11 w-full sm:w-auto"
        disabled={!task.canComplete || busy}
        onClick={() => setDialog("complete")}
      >
        <CircleCheck aria-hidden="true" />
        Complete task
      </Button>
    </div>
  );

  const aside = (
    <Card aria-labelledby="task-summary-heading">
      <CardHeader title="Task details" titleId="task-summary-heading" />
      <CardContent>
        <dl className="flex flex-col gap-4 text-body-sm">
          <Detail label={where.fromLabel}>{where.from}</Detail>
          <Detail label={where.toLabel}>{where.to}</Detail>
          <Detail label="Planned for">{formatDate(task.scheduledFor)}</Detail>
          <Detail label="Assigned">{formatDateTime(task.assignedAt)}</Detail>
          {task.completedAt ? <Detail label="Completed">{formatDateTime(task.completedAt)}</Detail> : null}
          {task.note ? <Detail label="Note from the dispatcher">{task.note}</Detail> : null}
        </dl>
      </CardContent>
    </Card>
  );

  return (
    <DetailPage
      title={taskTitle(task.type)}
      description={taskRouteText(task, districtName)}
      status={<TaskStatusBadge status={task.status} />}
      aside={aside}
      {...back}
    >
      <div className="flex flex-col gap-6">
        {courierWork ? null : (
          <InlineNotice tone="error" title="This isn't a pickup or delivery task">
            Branch transfers aren&apos;t courier work, so this task can&apos;t be worked here. Its parcels are shown for
            information only. Ask your dispatcher about it.
          </InlineNotice>
        )}

        <Card aria-labelledby="task-next-heading">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <TaskTypeIcon type={task.type} />
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id="task-next-heading" className="text-h3 text-grey-900">
                  {next.title}
                </h2>
                <p className="text-body-sm text-grey-600">{next.message}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-label text-grey-900 tabular-nums" aria-live="polite">
                {refreshing ? "Updating…" : progress}
              </p>
              <TaskProgressBar counts={task.counts} label={progress} />
            </div>
            {actions}
          </CardContent>
        </Card>

        <Card aria-labelledby="task-parcels-heading" aria-busy={refreshing}>
          <CardHeader
            title="Parcels"
            titleId="task-parcels-heading"
            description={
              closed
                ? parcelsText(task.counts.total)
                : task.counts.open === 0
                  ? "Every parcel is updated"
                  : `${parcelsText(task.counts.open)} still to update`
            }
          />
          <ul className="divide-y divide-grey-100">
            {task.items.map((item) => (
              <TaskItemRow
                key={item.parcelId}
                item={item}
                taskType={task.type}
                districtName={districtName}
                busy={busy}
                readOnly={!courierWork}
                onStep={(outcome) => setTarget({ item, outcome })}
              />
            ))}
          </ul>
        </Card>
      </div>

      <OutcomeDialog
        assignmentId={task.assignmentId}
        taskType={task.type}
        target={target}
        onClose={() => setTarget(null)}
        onSaved={saved}
        onFailure={failed}
      />
      {closed || !courierWork ? null : (
        <>
          <HandoverDialog
            task={task}
            open={dialog === "handover"}
            districtName={districtName}
            onClose={() => setDialog(null)}
            onSavingChange={setSaving}
            onSaved={saved}
            onFailure={failed}
          />
          <CompleteTaskDialog
            task={task}
            open={dialog === "complete"}
            districtName={districtName}
            onClose={() => setDialog(null)}
            onSavingChange={setSaving}
            onCompleted={completed}
            onFailure={failed}
          />
        </>
      )}
    </DetailPage>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-grey-600 uppercase">{label}</dt>
      <dd className="break-words text-grey-900">{children}</dd>
    </div>
  );
}
