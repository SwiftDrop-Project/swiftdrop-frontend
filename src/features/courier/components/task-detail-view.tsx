"use client";

import { useParams } from "next/navigation";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime } from "@/lib/format";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import { ASSIGNMENT_TYPE_LABEL, courierRoutes, HANDOVER_ACTION_LABEL } from "../lib/labels";
import { parcelsText, progressText, taskRouteText } from "../lib/task-view";
import type { CourierTaskDetail } from "../types";
import { CourierLoadError } from "./courier-load-error";
import { TaskStatusBadge } from "./task-badges";
import { TaskItemRow } from "./task-item-row";

const BACK = { backHref: courierRoutes.today, backLabel: "Back to today's tasks" };

/** /courier/tasks/[assignmentId]: one of the courier's tasks with its parcels (read only for now). */
export function CourierTaskView({ assignmentId: idProp }: { assignmentId?: string }) {
  const params = useParams<{ assignmentId?: string }>();
  const assignmentId = idProp ?? params.assignmentId ?? "";
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

  return <TaskReady task={loaded.data} />;
}

function TaskReady({ task }: { task: CourierTaskDetail }) {
  const districtName = useDistrictName();
  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";
  const readyCount = task.items.filter((item) => item.readyForHandover).length;

  // Shown disabled until F2B builds the handover and completing; the API's readyForHandover / canComplete decide.
  const actions = closed ? undefined : (
    <>
      <Button variant="secondary" disabled>
        {HANDOVER_ACTION_LABEL[task.type]}
        {readyCount > 0 ? ` (${readyCount})` : ""}
      </Button>
      <Button disabled>Complete task</Button>
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
      {...BACK}
    >
      <div className="flex flex-col gap-6">
        {closed ? (
          <InlineNotice title={task.status === "COMPLETED" ? "This task is completed" : "This task was cancelled"}>
            Nothing more to do here. The parcels go on in other tasks.
          </InlineNotice>
        ) : (
          <InlineNotice title="Updating parcels from this page is coming soon">
            For now you can see each parcel and its next step. The buttons turn on in the next update.
          </InlineNotice>
        )}

        <Card aria-labelledby="task-parcels-heading">
          <CardHeader
            title="Parcels"
            titleId="task-parcels-heading"
            description={`${task.counts.open} of ${parcelsText(task.counts.total)} still open`}
          />
          <ul className="divide-y divide-grey-100">
            {task.items.map((item) => (
              <TaskItemRow key={item.parcelId} item={item} districtName={districtName} />
            ))}
          </ul>
        </Card>
      </div>
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
