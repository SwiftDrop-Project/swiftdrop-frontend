import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { ASSIGNMENT_TYPE_LABEL, courierRoutes } from "../lib/labels";
import { isLaterDay, progressText, taskRouteText } from "../lib/task-view";
import type { CourierTaskSummary } from "../types";
import { TaskStatusBadge } from "./task-badges";

/**
 * One task in the courier's lists: type and status, where it goes, the planned day, how far it is, when it was
 * completed, and "Open". Render it inside a <ul>.
 * - Today's tasks pass `today`: a task planned for a later day gets a "Planned for …" badge, and a task completed
 *   today shows the time.
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
  const completed =
    task.status === "COMPLETED" && task.completedAt
      ? today !== undefined
        ? `Completed at ${formatTime(task.completedAt)}`
        : `Completed ${formatDateTime(task.completedAt)}`
      : null;

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-label font-semibold text-grey-900">{typeLabel} task</p>
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
          {completed ? <> · {completed}</> : null}
        </p>

        {task.note && !closed ? (
          <p className="line-clamp-2 break-words text-body-sm text-grey-600">Note: {task.note}</p>
        ) : null}
      </div>

      <Button asChild variant="secondary" className="w-full sm:w-auto">
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
