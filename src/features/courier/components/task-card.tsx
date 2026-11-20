import Link from "next/link";
import { CalendarDays, ChevronRight, CircleDot, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/format";
import { courierRoutes, taskTitle } from "../lib/labels";
import { isLaterDay, progressText, taskLocations, taskRouteText } from "../lib/task-view";
import type { CourierTaskSummary } from "../types";
import { TaskProgressBar, TaskStatusBadge, TaskTypeIcon } from "./task-badges";

/**
 * One task on today's dashboard: type and status, the day, where the courier collects and where they take the
 * parcels, how many parcels are updated, the dispatcher's note, and one button to open it. Render it inside a <ul>.
 */
export function TaskCard({
  task,
  today,
  districtName,
}: {
  task: CourierTaskSummary;
  /** Today in Sri Lankan time ("yyyy-mm-dd"), from the API. */
  today: string;
  districtName: (code: string) => string;
}) {
  const title = taskTitle(task.type);
  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";
  const where = taskLocations(task, districtName);
  const progress = progressText(task.counts);
  const when =
    task.status === "COMPLETED" && task.completedAt
      ? `Completed at ${formatTime(task.completedAt)}`
      : task.status === "CANCELLED"
        ? "Cancelled by the dispatcher"
        : isLaterDay(task.scheduledFor, today)
          ? `Planned for ${formatDate(task.scheduledFor)}`
          : `Today, ${formatDate(task.scheduledFor)}`;
  const action = task.status === "IN_PROGRESS" ? "Continue task" : closed ? "View details" : "View task";

  return (
    <li className="min-w-0">
      <Card className="flex h-full flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <TaskTypeIcon type={task.type} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-h3 text-grey-900">{title}</h3>
              <TaskStatusBadge status={task.status} />
            </div>
            <p className="flex items-center gap-1.5 text-body-sm text-grey-600 tabular-nums">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              {when}
            </p>
          </div>
        </div>

        <dl className="flex flex-col gap-2 text-body-sm">
          <div className="flex items-start gap-2">
            <CircleDot className="mt-0.5 size-4 shrink-0 text-grey-500" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-caption text-grey-600">{where.fromLabel}</dt>
              <dd className="break-words text-grey-900">{where.from}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-grey-500" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-caption text-grey-600">{where.toLabel}</dt>
              <dd className="break-words text-grey-900">{where.to}</dd>
            </div>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <p className="text-label text-grey-900 tabular-nums">{progress}</p>
          <TaskProgressBar counts={task.counts} label={`${title}: ${progress}`} />
        </div>

        {task.note && !closed ? (
          <p className="line-clamp-2 break-words rounded-md bg-grey-50 px-3 py-2 text-body-sm text-grey-700">
            Note: {task.note}
          </p>
        ) : null}

        <Button asChild variant="secondary" className="mt-auto h-11 w-full">
          <Link
            href={courierRoutes.task(task.assignmentId)}
            // Starts with the visible words, then tells the cards apart for screen readers.
            aria-label={`${action}: ${title.toLowerCase()}, ${taskRouteText(task, districtName)}, ${formatDate(task.scheduledFor)}`}
          >
            {action}
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      </Card>
    </li>
  );
}
