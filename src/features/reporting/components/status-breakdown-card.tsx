import * as React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PARCEL_STATUS_LABEL } from "@/components/ui/status-badge";
import type { ParcelStatus } from "@/types";
import { formatCount } from "../lib/labels";

const STATUS_ORDER = Object.keys(PARCEL_STATUS_LABEL) as ParcelStatus[];

/**
 * Parcels in each status right now, as thin horizontal bars in one neutral hue (the job is comparing amounts, so
 * one colour; the status name labels each bar). The value sits at the bar's tip. `byStatus` null shows placeholders.
 */
export function StatusBreakdownCard({ byStatus }: { byStatus: Record<ParcelStatus, number> | null }) {
  const titleId = React.useId();
  const counts = byStatus ? STATUS_ORDER.map((status) => byStatus[status] ?? 0) : [];
  const total = counts.reduce((sum, value) => sum + value, 0);
  const largest = Math.max(1, ...counts);

  return (
    <Card aria-labelledby={titleId} className="flex flex-col">
      <CardHeader
        title="Parcels by status"
        titleId={titleId}
        description="Every parcel, where it is right now"
        aside={
          byStatus ? (
            <span className="text-body-sm text-grey-600 tabular-nums">{formatCount(total)} parcels</span>
          ) : null
        }
      />
      <dl className="flex flex-col gap-3 p-4 sm:p-6">
        {byStatus
          ? STATUS_ORDER.map((status, index) => {
              const value = counts[index];
              const share = total === 0 ? 0 : Math.round((value / total) * 100);
              return (
                <div key={status} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-body-sm">
                    <dt className="text-grey-700">{PARCEL_STATUS_LABEL[status]}</dt>
                    <dd className="text-grey-900 tabular-nums">
                      {formatCount(value)}
                      <span className="ml-2 text-grey-500">{share}%</span>
                    </dd>
                  </div>
                  <div className="h-2 rounded-full bg-grey-100" aria-hidden="true">
                    {value > 0 ? (
                      <div
                        className="h-full rounded-full bg-grey-700"
                        style={{ width: `${Math.max(2, (value / largest) * 100)}%` }}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })
          : STATUS_ORDER.map((status) => (
              <div key={status} className="flex flex-col gap-2" aria-hidden="true">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
      </dl>
    </Card>
  );
}
