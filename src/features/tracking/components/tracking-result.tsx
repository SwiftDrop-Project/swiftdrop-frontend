"use client";

import { PackageSearch, RotateCw } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { formatDateTime, formatTrackingNumber, humanizeCode } from "@/lib/format";
import { useParcelTracking } from "../hooks/use-parcel-tracking";
import { failureReasonLabel, trackingStatusLabel } from "../labels";
import type { Tracking, TrackingPlace, TrackingStep } from "../types";
import { LiveIndicator, TrackingStatusBadge } from "./tracking-badges";

function districtName(code: string | null): string {
  return code ? humanizeCode(code) : "";
}

function placeLabel(place: TrackingPlace | null): string {
  if (!place) return "—";
  const district = districtName(place.district);
  return place.city && place.city !== district ? `${place.city}, ${district}` : district;
}

/** One line under the status, in plain words. */
export function stepDescription(step: Pick<TrackingStep, "status" | "branch" | "failureReason">, tracking?: Tracking) {
  switch (step.status) {
    case "CREATED":
      return "Booked. Waiting for a courier to collect it.";
    case "PICKED_UP":
      return tracking?.from ? `Collected in ${placeLabel(tracking.from)}.` : "Collected from the sender.";
    case "AT_BRANCH":
      return step.branch ? `At our ${districtName(step.branch)} branch.` : "At one of our branches.";
    case "IN_TRANSIT":
      return "On its way to the next branch.";
    case "OUT_FOR_DELIVERY":
      return "With a courier, on the way to the recipient.";
    case "DELIVERED":
      return "Handed over to the recipient.";
    case "FAILED":
      return step.failureReason
        ? `Not delivered: ${failureReasonLabel(step.failureReason).toLowerCase()}.`
        : "Not delivered.";
  }
}

function timelineItems(tracking: Tracking): TimelineItem[] {
  return [...tracking.history].reverse().map((step, index) => ({
    id: `${step.occurredAt}-${index}`,
    title: trackingStatusLabel(step.status),
    description: stepDescription(step, tracking),
    timestamp: step.occurredAt,
    tone: step.status === "DELIVERED" ? "success" : step.status === "FAILED" ? "error" : "default",
  }));
}

/**
 * A parcel's status and journey, updated live: loads it, then follows it over the WebSocket (polling every 30 s if
 * that fails). For the public page, the customer's tracking page and the dispatchers' board.
 */
export function TrackingResult({
  trackingNumber,
  headingLevel = "h2",
}: {
  trackingNumber: string;
  headingLevel?: "h1" | "h2";
}) {
  const { state, live, retry } = useParcelTracking(trackingNumber);
  const Heading = headingLevel;

  if (state.status === "loading") {
    return (
      <Card className="p-6" aria-busy="true" aria-label="Loading parcel">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    );
  }

  if (state.status === "not-found") {
    return (
      <Card>
        <EmptyState
          icon={PackageSearch}
          title={`No parcel ${formatTrackingNumber(trackingNumber)}`}
          description={state.message}
        />
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <InlineNotice tone="error" title="We couldn't load this parcel">
        <p>{state.message}</p>
        <Button variant="secondary" className="mt-3" onClick={retry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </InlineNotice>
    );
  }

  const tracking = state.data;
  const latest = tracking.history.at(-1) ?? {
    status: tracking.status,
    branch: tracking.currentBranch,
    failureReason: null,
  };
  return (
    <div className="flex flex-col gap-6">
      <Card aria-labelledby="tracking-heading">
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-caption text-grey-600 uppercase">Tracking number</span>
              <Heading id="tracking-heading" className="text-h3 text-grey-900 tabular-nums">
                {formatTrackingNumber(tracking.trackingNumber)}
              </Heading>
            </div>
            <LiveIndicator state={live} />
          </div>
          <div className="flex flex-col gap-2" aria-live="polite">
            <div>
              <TrackingStatusBadge status={tracking.status} />
            </div>
            <p className="text-body text-grey-900">{stepDescription(latest, tracking)}</p>
            <p className="text-caption text-grey-600 tabular-nums">Last update {formatDateTime(tracking.updatedAt)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 border-t border-grey-200 pt-4 text-body-sm">
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-caption text-grey-600 uppercase">From</dt>
              <dd className="text-grey-900">{placeLabel(tracking.from)}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-caption text-grey-600 uppercase">To</dt>
              <dd className="text-grey-900">{placeLabel(tracking.to)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card aria-labelledby="journey-heading">
        <CardHeader title="Journey" titleId="journey-heading" description="Newest first, in Sri Lankan time." />
        <CardContent>
          <Timeline items={timelineItems(tracking)} />
        </CardContent>
      </Card>
    </div>
  );
}
