"use client";

import Link from "next/link";
import { CircleCheck, ClipboardList, Clock, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import { courierRoutes } from "../lib/labels";
import { groupTodayTasks, splitCourierTasks } from "../lib/task-view";
import type { CourierTaskSummary } from "../types";
import { CourierLoadError } from "./courier-load-error";
import { TaskCard } from "./task-card";

const tasksText = (count: number) => `${count} ${count === 1 ? "task" : "tasks"}`;

/**
 * /courier: GET /courier/assignments/today as cards in three groups, in the API's order: In progress, Assigned (not
 * started, including tasks planned for a later day) and Completed today. Only pickups and deliveries are courier work;
 * a branch transfer the API sends anyway is counted in a notice, never shown as a task card.
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
  const { courier, other } = splitCourierTasks(today.assignments);
  const groups = groupTodayTasks(courier);

  const section = (id: string, title: string, description: string, tasks: CourierTaskSummary[]) =>
    tasks.length === 0 ? null : (
      <section aria-labelledby={id} className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={id} className="text-h3 text-grey-900">
              {title}
            </h2>
            <p className="text-body-sm text-grey-600">{description}</p>
          </div>
          <p className="shrink-0 text-label text-grey-600 tabular-nums">{tasksText(tasks.length)}</p>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.assignmentId} task={task} today={today.date} districtName={districtName} />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-body-sm text-grey-600 tabular-nums">{formatDate(today.date)}</p>
        <ul className="grid grid-cols-3 gap-3" aria-label="Today at a glance">
          <Stat icon={Clock} label="In progress" value={groups.inProgress.length} />
          <Stat icon={ListTodo} label="Assigned" value={groups.assigned.length} />
          <Stat
            icon={CircleCheck}
            label="Completed today"
            value={groups.doneToday.filter((task) => task.status === "COMPLETED").length}
          />
        </ul>
      </div>

      {other.length > 0 ? (
        <InlineNotice title={`${tasksText(other.length)} not shown`}>
          Branch transfers aren&apos;t courier work, so they aren&apos;t shown here. Ask your dispatcher about{" "}
          {other.length === 1 ? "it" : "them"}.
        </InlineNotice>
      ) : null}

      {courier.length === 0 ? (
        <Card className="p-6 sm:p-10">
          <EmptyState
            icon={ClipboardList}
            size="lg"
            title="No tasks assigned to you"
            description="When a dispatcher gives you a pickup or delivery task, it will appear here."
            actions={
              <Button asChild variant="secondary">
                <Link href={courierRoutes.history}>View task history</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {section("tasks-in-progress", "In progress", "Tasks you have started.", groups.inProgress)}
          {section(
            "tasks-assigned",
            "Assigned",
            "Not started yet, oldest first. A task planned for a later day shows its date.",
            groups.assigned,
          )}
          {section("tasks-done-today", "Completed today", "Completed or cancelled today.", groups.doneToday)}
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: number }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-grey-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <Icon className="size-5 shrink-0 text-grey-500" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <span className="text-h2 text-grey-900 tabular-nums">{value}</span>
        <span className="text-caption text-grey-600">{label}</span>
      </div>
    </li>
  );
}

function TodayLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading your tasks">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((tile) => (
          <Skeleton key={tile} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((card) => (
            <Card key={card} className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-md" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-11 w-full" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
