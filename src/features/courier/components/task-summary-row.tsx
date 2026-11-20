import Link from "next/link";
import { CircleCheck, CircleSlash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ASSIGNMENT_TYPE_LABEL, courierRoutes, taskTitle } from "../lib/labels";
import { isLaterDay, progressText, taskRouteText } from "../lib/task-view";
import type { CourierTaskSummary } from "../types";
import { TaskStatusBadge, TaskTypeIcon } from "./task-badges";

/**
 * One task as a row (the history): type icon, type and status, where it went, the planned day and how the parcels
 * went, when it was completed (or that it was cancelled), and "Open". Render it inside a <ul>.
 * - Today's tasks may pass `today`: a later day gets a "Planned for …" badge, and a task completed today shows the time.
 * - The history passes no `today`: completed tasks show the date and time.
 */
export function TaskSummaryRow({
  task,
  today,
  districtName,
  href,
}: {
  task: CourierTaskSummary;
  /** Today in Sri Lankan time ("yyyy-mm-dd"), from the API; only for today's tasks. */
  today?: string;
  districtName: (code: string) => string;
  /** Where "Open" goes; the task page by default. */
  href?: string;
}) {
  const typeLabel = ASSIGNMENT_TYPE_LABEL[task.type];
  const laterDay = today !== undefined && isLaterDay(task.scheduledFor, today);
  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";
  const route = taskRouteText(task, districtName);
  const finished =
    task.status === "COMPLETED" && task.completedAt
      ? today !== undefined
        ? `Completed at ${formatTime(task.completedAt)}`
        : `Completed ${formatDateTime(task.completedAt)}`
      : task.status === "CANCELLED"
        ? "Cancelled by the dispatcher"
        : null;

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <TaskTypeIcon type={task.type} className="hidden sm:flex" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-label font-semibold text-grey-900">{taskTitle(task.type)}</p>
            <TaskStatusBadge status={task.status} />
            {laterDay ? (
              <Badge tone="outline" dot={false}>
                Planned for {formatDate(task.scheduledFor)}
              </Badge>
            ) : null}
          </div>

          <p className="break-words text-body-sm text-grey-900">{route}</p>

          <p className="break-words text-body-sm text-grey-600 tabular-nums">
            {laterDay ? null : <>{formatDate(task.scheduledFor)} · </>}
            {progressText(task.counts)}
          </p>

          {finished ? (
            <p
              className={cn(
                "flex items-center gap-1.5 text-label tabular-nums",
                task.status === "COMPLETED" ? "text-success" : "text-grey-700",
              )}
            >
              {task.status === "COMPLETED" ? (
                <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <CircleSlash className="size-4 shrink-0" aria-hidden="true" />
              )}
              {finished}
            </p>
          ) : null}

          {task.note && !closed ? (
            <p className="line-clamp-2 break-words text-body-sm text-grey-600">Note: {task.note}</p>
          ) : null}
        </div>
      </div>

      <Button asChild variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
        <Link
          href={href ?? courierRoutes.task(task.assignmentId)}
          // Unique per row for screen readers: type, route and day.
          aria-label={`Open ${typeLabel.toLowerCase()} task: ${route}, ${formatDate(task.scheduledFor)}`}
        >
          Open
        </Link>
      </Button>
    </li>
  );
}
