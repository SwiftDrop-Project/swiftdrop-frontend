"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTrackingNumber } from "@/lib/format";
import { dispatchApi } from "../api";
import { useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { ASSIGNMENT_TYPE_LABEL } from "../labels";
import type { AssignmentDetail } from "../types";
import { AssignmentStatusBadge, OutcomeBadge, ParcelStatusBadge } from "./dispatch-badges";

/** At most this many open tasks are opened, which is more than a courier has in a day. */
const MAX_OPEN_TASKS = 20;

/** The courier's open tasks (assigned or in progress), each with its parcels. */
async function loadOpenTasks(courierId: string, signal: AbortSignal): Promise<AssignmentDetail[]> {
  const [assigned, inProgress] = await Promise.all([
    dispatchApi.listAssignments({ courierId, status: "ASSIGNED", size: MAX_OPEN_TASKS }, signal),
    dispatchApi.listAssignments({ courierId, status: "IN_PROGRESS", size: MAX_OPEN_TASKS }, signal),
  ]);
  const tasks = [...inProgress.content, ...assigned.content].slice(0, MAX_OPEN_TASKS);
  return Promise.all(tasks.map((task) => dispatchApi.getAssignment(task.id, signal)));
}

/** What a courier has been given and not finished yet: their open tasks and the parcels in them. */
export function CourierParcels({
  courierId,
  courierName,
  taskLinks = true,
}: {
  courierId: string;
  courierName: string;
  /** Link each task to /dispatcher/tasks/{id} (dispatchers only; admins can't open it). */
  taskLinks?: boolean;
}) {
  const { name } = useDistrictName();
  const tasks = useLoad(`courier-parcels:${courierId}`, (signal) => loadOpenTasks(courierId, signal));

  if (tasks.status === "loading") {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label={`Loading ${courierName}'s parcels`}>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (tasks.status === "error") {
    return (
      <InlineNotice tone="error" title="We couldn't load the parcels">
        <p>{tasks.error}</p>
        <Button variant="secondary" className="mt-3" onClick={tasks.reload}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </InlineNotice>
    );
  }
  if (tasks.data.length === 0) {
    return <p className="text-body-sm text-grey-600">{courierName} has no open tasks.</p>;
  }

  return (
    <ul className="flex flex-col gap-3" aria-label={`${courierName}'s open tasks`}>
      {tasks.data.map((task) => {
        const route = [task.originBranch, task.destinationBranch]
          .filter((branch) => branch !== null)
          .map((branch) => name(branch))
          .join(" → ");
        return (
          <li key={task.id} className="rounded-md border border-grey-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grey-100 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label font-semibold text-grey-900">
                  {ASSIGNMENT_TYPE_LABEL[task.type]}
                  {route ? ` · ${route}` : ""}
                </span>
                <AssignmentStatusBadge status={task.status} />
              </div>
              {taskLinks ? (
                <Link
                  href={`/dispatcher/tasks/${task.id}`}
                  className="text-label text-orange-700 hover:text-orange-800 hover:underline"
                >
                  Open task
                </Link>
              ) : null}
            </div>
            <ul className="divide-y divide-grey-100">
              {task.items.map((item) => (
                <li key={item.parcelId} className="flex flex-wrap items-center gap-2 px-3 py-2 text-body-sm">
                  <span className="font-medium text-grey-900 tabular-nums">
                    {item.trackingNumber ? formatTrackingNumber(item.trackingNumber) : "Unknown parcel"}
                  </span>
                  {item.to ? (
                    <span className="text-grey-600">
                      to {item.to.city}, {name(item.to.district)}
                    </span>
                  ) : null}
                  <span className="flex flex-wrap gap-2 sm:ml-auto">
                    {item.parcelStatus ? <ParcelStatusBadge status={item.parcelStatus} /> : null}
                    <OutcomeBadge outcome={item.outcome} />
                  </span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
