"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import { courierRoutes } from "../lib/labels";
import { groupTodayTasks } from "../lib/task-view";
import type { CourierTaskSummary } from "../types";
import { CourierLoadError } from "./courier-load-error";
import { TaskSummaryRow } from "./task-summary-row";

const tasksText = (count: number) => `${count} ${count === 1 ? "task" : "tasks"}`;

/**
 * /courier: GET /courier/assignments/today in three groups, in the API's order: In progress, Assigned (not started,
 * including tasks planned for a later day) and Done today.
 */
export function CourierTodayTasks() {
  const loaded = useCourierLoad("courier-today", (signal) => courierApi.today(signal));
  const districtName = useDistrictName();

  if (loaded.status === "loading") return <TodayLoading />;

  if (loaded.status === "error") {
    return (
      <Card className="p-4 sm:p-6">
        <CourierLoadError error={loaded.error} title="We couldn't load your tasks" onRetry={loaded.reload} />
      </Card>
    );
  }

  const today = loaded.data;
  const groups = groupTodayTasks(today.assignments);

  if (today.assignments.length === 0) {
    return (
      <Card className="p-6 sm:p-10">
        <EmptyState
          icon={ClipboardList}
          size="lg"
          title="No tasks assigned to you"
          description="When a dispatcher gives you a pickup, transfer or delivery task, it will appear here."
          actions={
            <Button asChild variant="secondary">
              <Link href={courierRoutes.history}>View task history</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const section = (id: string, title: string, description: string, tasks: CourierTaskSummary[]) =>
    tasks.length === 0 ? null : (
      <Card aria-labelledby={id}>
        <CardHeader
          titleId={id}
          title={title}
          description={description}
          aside={<p className="text-label text-grey-600 tabular-nums">{tasksText(tasks.length)}</p>}
        />
        <ul className="divide-y divide-grey-100">
          {tasks.map((task) => (
            <TaskSummaryRow key={task.assignmentId} task={task} today={today.date} districtName={districtName} />
          ))}
        </ul>
      </Card>
    );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-sm text-grey-600 tabular-nums">
        {formatDate(today.date)} · {tasksText(today.open)} open · {today.completedToday} completed today
      </p>
      {section("tasks-in-progress", "In progress", "Tasks you have started.", groups.inProgress)}
      {section(
        "tasks-assigned",
        "Assigned",
        "Not started yet, oldest first. A task planned for a later day shows its date.",
        groups.assigned,
      )}
      {section("tasks-done-today", "Done today", "Completed or cancelled today.", groups.doneToday)}
    </div>
  );
}

function TodayLoading() {
  return (
    <Card aria-busy="true" aria-label="Loading your tasks">
      <div className="border-b border-grey-200 px-4 py-4 sm:px-6">
        <Skeleton className="h-6 w-32" />
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3 border-b border-grey-100 p-4 last:border-b-0 sm:px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      ))}
    </Card>
  );
}
