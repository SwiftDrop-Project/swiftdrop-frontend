"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTrackingNumber } from "@/lib/format";
import type { DistrictCode } from "@/types";
import { dispatchApi } from "../api";
import { useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import type { AssignmentItem, AssignmentType } from "../types";
import { ParcelStatusBadge } from "./dispatch-badges";

/** At most this many open tasks are read, which is more than a courier has in a day. */
const MAX_OPEN_TASKS = 20;

interface AssignedParcel {
  item: AssignmentItem;
  type: AssignmentType;
  destinationBranch: DistrictCode | null;
}

/**
 * The parcels the courier still has to handle, one by one. The backend keeps them in tasks; they are read from the
 * courier's open tasks (assigned or in progress) and listed in the order they were given, without the tasks.
 */
async function loadAssignedParcels(courierId: string, signal: AbortSignal): Promise<AssignedParcel[]> {
  const [assigned, inProgress] = await Promise.all([
    dispatchApi.listAssignments({ courierId, status: "ASSIGNED", size: MAX_OPEN_TASKS }, signal),
    dispatchApi.listAssignments({ courierId, status: "IN_PROGRESS", size: MAX_OPEN_TASKS }, signal),
  ]);
  const summaries = [...inProgress.content, ...assigned.content]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, MAX_OPEN_TASKS);
  const tasks = await Promise.all(summaries.map((task) => dispatchApi.getAssignment(task.id, signal)));
  return tasks.flatMap((task) =>
    task.items
      .filter((item) => item.closedAt === null)
      .sort((a, b) => a.sequence - b.sequence)
      .map((item) => ({ item, type: task.type, destinationBranch: task.destinationBranch })),
  );
}

/** The parcels assigned to a courier that they haven't finished, one row each. */
export function CourierParcels({ courierId, courierName }: { courierId: string; courierName: string }) {
  const { name } = useDistrictName();
  const parcels = useLoad(`courier-parcels:${courierId}`, (signal) => loadAssignedParcels(courierId, signal));

  function toDo({ item, type, destinationBranch }: AssignedParcel): string {
    if (type === "PICKUP") return item.from ? `Collect in ${item.from.city}` : "Collect from the sender";
    if (type === "TRANSFER") return `Take to ${name(destinationBranch)} branch`;
    return item.to ? `Deliver to ${item.to.city}` : "Deliver to the recipient";
  }

  if (parcels.status === "loading") {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label={`Loading ${courierName}'s parcels`}>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (parcels.status === "error") {
    return (
      <InlineNotice tone="error" title="We couldn't load the parcels">
        <p>{parcels.error}</p>
        <Button variant="secondary" className="mt-3" onClick={parcels.reload}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </InlineNotice>
    );
  }
  if (parcels.data.length === 0) {
    return <p className="text-body-sm text-grey-600">{courierName} has no parcels to handle.</p>;
  }

  return (
    <ul
      className="divide-y divide-grey-100 rounded-md border border-grey-200 bg-white"
      aria-label={`${courierName}'s parcels`}
    >
      {parcels.data.map((parcel) => (
        <li
          key={`${parcel.item.parcelId}:${parcel.type}`}
          className="flex flex-wrap items-center gap-2 px-3 py-2 text-body-sm"
        >
          <span className="font-medium text-grey-900 tabular-nums">
            {parcel.item.trackingNumber ? formatTrackingNumber(parcel.item.trackingNumber) : "Unknown parcel"}
          </span>
          <span className="text-grey-600">{toDo(parcel)}</span>
          {parcel.item.parcelStatus ? (
            <span className="sm:ml-auto">
              <ParcelStatusBadge status={parcel.item.parcelStatus} />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
