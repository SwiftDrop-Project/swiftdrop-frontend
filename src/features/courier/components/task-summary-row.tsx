import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { ASSIGNMENT_TYPE_LABEL, courierRoutes } from "../lib/labels";
import { isLaterDay, progressText, taskRouteText } from "../lib/task-view";
import type { CourierTaskSummary } from "../types";
import { TaskStatusBadge } from "./task-badges";

/**
 * One task in the courier's lists: type and status, where it goes, the planned day (marked when it is a later day),
 * how far it is, and "Open". Render it inside a <ul>.
 */
export function TaskSummaryRow({
  task,
  today,
  districtName,
}: {
  task: CourierTaskSummary;
  /** Today in Sri Lankan time ("yyyy-mm-dd"), from the API. */
  today: string;
  districtName: (code: string) => string;
}) {
  const typeLabel = ASSIGNMENT_TYPE_LABEL[task.type];
  const laterDay = isLaterDay(task.scheduledFor, today);
  const closed = task.status === "COMPLETED" || task.status === "CANCELLED";

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

        <p className="break-words text-body-sm text-grey-900">{taskRouteText(task, districtName)}</p>

        <p className="text-body-sm text-grey-600 tabular-nums">
          {laterDay ? null : <>{formatDate(task.scheduledFor)} · </>}
          {progressText(task.counts)}
          {task.status === "COMPLETED" && task.completedAt ? <> · Completed at {formatTime(task.completedAt)}</> : null}
        </p>

        {task.note && !closed ? (
          <p className="line-clamp-2 break-words text-body-sm text-grey-600">Note: {task.note}</p>
        ) : null}
      </div>

      <Button asChild variant="secondary" className="w-full sm:w-auto">
        <Link href={courierRoutes.task(task.assignmentId)} aria-label={`Open ${typeLabel.toLowerCase()} task`}>
          Open
        </Link>
      </Button>
    </li>
  );
}
