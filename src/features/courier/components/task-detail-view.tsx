"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { ASSIGNMENT_TYPE_LABEL, courierRoutes, HANDOVER_ACTION_LABEL } from "../lib/labels";
import type { OutcomeFailure } from "../lib/outcome-flow";
import { handoverCandidates } from "../lib/task-actions";
import { parcelsText, progressText, taskRouteText } from "../lib/task-view";
import type { CourierTaskDetail, CourierTaskSummary } from "../types";
import { CompleteTaskDialog } from "./complete-task-dialog";
import { CourierLoadError } from "./courier-load-error";
import { HandoverDialog } from "./handover-dialog";
import { OutcomeDialog, type OutcomeTarget } from "./outcome-dialog";
import { TaskStatusBadge } from "./task-badges";
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

  // No actions on a completed or cancelled task.
  const actions = closed ? undefined : (
    <>
      <Button variant="secondary" disabled={readyCount === 0 || busy} onClick={() => setDialog("handover")}>
        {HANDOVER_ACTION_LABEL[task.type]}
        {readyCount > 0 ? ` (${readyCount})` : ""}
      </Button>
      <Button disabled={!task.canComplete || busy} onClick={() => setDialog("complete")}>
        Complete task
      </Button>
    </>
  );

  const aside = (
    <Card aria-labelledby="task-summary-heading">
      <CardHeader title="Task details" titleId="task-summary-heading" />
      <CardContent>
        <dl className="flex flex-col gap-4 text-body-sm">
          <Detail label="Route">{taskRouteText(task, districtName)}</Detail>
          <Detail label="Planned for">{formatDate(task.scheduledFor)}</Detail>
          <Detail label="Assigned">{formatDateTime(task.assignedAt)}</Detail>
          {task.completedAt ? <Detail label="Completed">{formatDateTime(task.completedAt)}</Detail> : null}
          <Detail label="Progress">{progressText(task.counts)}</Detail>
          {closed ? null : (
            <>
              <Detail label="Ready to hand over">{readyCount === 0 ? "None yet" : parcelsText(readyCount)}</Detail>
              <Detail label="Can be completed">
                {task.canComplete
                  ? "Yes, every parcel is updated"
                  : `Not yet: ${parcelsText(task.counts.open)} still open`}
              </Detail>
            </>
          )}
          {task.note ? <Detail label="Note from the dispatcher">{task.note}</Detail> : null}
        </dl>
      </CardContent>
    </Card>
  );

  return (
    <DetailPage
      title={`${ASSIGNMENT_TYPE_LABEL[task.type]} task`}
      description={taskRouteText(task, districtName)}
      status={<TaskStatusBadge status={task.status} />}
      actions={actions}
      aside={aside}
      {...back}
    >
      <div className="flex flex-col gap-6">
        {closed ? (
          <InlineNotice title={task.status === "COMPLETED" ? "This task is completed" : "This task was cancelled"}>
            Nothing more to do here. The parcels go on in other tasks.
          </InlineNotice>
        ) : task.canComplete ? (
          <InlineNotice title="Every parcel is updated">
            Complete the task when you&apos;re done. Completing it doesn&apos;t change where the parcels are.
          </InlineNotice>
        ) : null}

        <Card aria-labelledby="task-parcels-heading" aria-busy={refreshing}>
          <CardHeader
            title="Parcels"
            titleId="task-parcels-heading"
            description={
              <span aria-live="polite">
                {refreshing
                  ? "Updating…"
                  : `${task.counts.open} of ${parcelsText(task.counts.total)} still open`}
              </span>
            }
          />
          <ul className="divide-y divide-grey-100">
            {task.items.map((item) => (
              <TaskItemRow
                key={item.parcelId}
                item={item}
                districtName={districtName}
                busy={busy}
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
      {closed ? null : (
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
