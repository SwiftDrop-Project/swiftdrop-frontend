"use client";

import { PackageSearch, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLink } from "@/components/ui/text-link";
import { useDistrictName } from "@/features/dispatch";
import { formatDateTime, formatTrackingNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MY_PARCELS_SIZE, useMyParcels } from "../hooks/use-my-parcels";
import { failureReasonLabel } from "../labels";
import type { IndexedParcel } from "../types";
import { LiveIndicator, TrackingStatusBadge } from "./tracking-badges";

/**
 * "Your parcels" on /customer/track: the customer's latest parcels, updated live over their private channel. Each
 * tracking number opens that parcel's journey on the same page.
 */
export function MyParcelsLive({ hrefFor }: { hrefFor: (trackingNumber: string) => string }) {
  const list = useMyParcels();
  const { name } = useDistrictName();

  function where(parcel: IndexedParcel): string {
    if (parcel.status === "AT_BRANCH" && parcel.currentBranch) return `At ${name(parcel.currentBranch)} branch`;
    if (parcel.status === "FAILED" && parcel.failureReason) return failureReasonLabel(parcel.failureReason);
    return parcel.to ? `To ${parcel.to.city}, ${name(parcel.to.district)}` : "";
  }

  const total = list.data?.totalElements ?? 0;
  return (
    <Card aria-labelledby="my-parcels-heading">
      <CardHeader
        title="Your parcels"
        titleId="my-parcels-heading"
        description={
          total > MY_PARCELS_SIZE
            ? `Your ${MY_PARCELS_SIZE} newest parcels of ${total}. They update here as they move.`
            : "Your parcels update here as they move."
        }
        aside={list.status === "ready" ? <LiveIndicator state={list.live} /> : null}
      />
      {list.status === "loading" ? (
        <div className="flex flex-col gap-3 p-4 sm:p-6" aria-busy="true" aria-label="Loading your parcels">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : list.status === "error" ? (
        <div className="p-4 sm:p-6">
          <InlineNotice tone="error" title="We couldn't load your parcels">
            <p>{list.error}</p>
            <Button variant="secondary" className="mt-3" onClick={list.retry}>
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
          </InlineNotice>
        </div>
      ) : list.data && list.data.content.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          headingLevel="h3"
          title="No parcels yet"
          description="Parcels you book appear here, and you can follow them as they move."
        />
      ) : (
        <ul className="divide-y divide-grey-100" aria-live="polite">
          {list.data?.content.map((parcel) => (
            <li
              key={parcel.parcelId}
              className={cn(
                "flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6",
                list.fresh.has(parcel.parcelId) && "bg-grey-50",
              )}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <TextLink
                  href={hrefFor(parcel.trackingNumber)}
                  className="font-medium tabular-nums"
                  aria-label={`Show the journey of ${formatTrackingNumber(parcel.trackingNumber)}`}
                >
                  {formatTrackingNumber(parcel.trackingNumber)}
                </TextLink>
                {where(parcel) ? <span className="text-body-sm text-grey-600">{where(parcel)}</span> : null}
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1">
                <TrackingStatusBadge status={parcel.status} />
                <span className="text-caption text-grey-600">Updated {formatDateTime(parcel.updatedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
