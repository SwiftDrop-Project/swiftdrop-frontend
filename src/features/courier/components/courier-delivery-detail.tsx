"use client";

import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PARCEL_STATUS_LABEL, StatusBadge } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { formatDateTime, formatRs, formatTrackingNumber } from "@/lib/format";
import { useCourierDelivery } from "../hooks/use-courier-delivery";
import { useDistrictName } from "../hooks/use-district-name";
import { courierRoutes, failureReasonLabel, formatWeight, isFinished } from "../lib/labels";
import type { CourierDeliveryDetail as Detail } from "../types";
import { ContactDetails } from "./contact-details";
import { LoadError } from "./load-error";
import { ParcelNotFound } from "./parcel-not-found";
import { StatusActions } from "./status-actions";

const BACK = { backHref: courierRoutes.today, backLabel: "Back to today's deliveries" } as const;

/** /courier/deliveries/[parcelId]: one parcel, what to do next, both contacts and the history. */
export function CourierDeliveryDetail({ parcelId }: { parcelId: string }) {
  const { state, reload, setParcel } = useCourierDelivery(parcelId);
  const districtName = useDistrictName();

  if (state.status === "loading") return <LoadingDetail />;

  if (state.status === "error") {
    if (state.error.kind === "not-found") return <ParcelNotFound />;
    return (
      <>
        <PageHeader title="Parcel" {...BACK} />
        <Card className="p-4 sm:p-6">
          <LoadError error={state.error} title="We couldn't load this parcel" onRetry={reload} />
        </Card>
      </>
    );
  }

  const { parcel } = state;
  const stopFirst = parcel.stop === "PICKUP" ? "pickup" : "recipient";

  const contactCards = [
    <Card key="pickup" aria-labelledby="parcel-pickup">
      <CardHeader titleId="parcel-pickup" title="Pickup" />
      <CardContent>
        <ContactDetails contact={parcel.pickup} districtName={districtName} />
      </CardContent>
    </Card>,
    <Card key="recipient" aria-labelledby="parcel-recipient">
      <CardHeader titleId="parcel-recipient" title="Recipient" />
      <CardContent>
        <ContactDetails contact={parcel.recipient} districtName={districtName} />
      </CardContent>
    </Card>,
  ];

  return (
    <DetailPage
      title={formatTrackingNumber(parcel.trackingNumber)}
      description={`To ${parcel.recipient.name}, ${parcel.recipient.city}`}
      status={<StatusBadge status={parcel.status} />}
      {...BACK}
      aside={
        <Card aria-labelledby="parcel-history">
          <CardHeader titleId="parcel-history" title="History" />
          <CardContent>
            {parcel.history.length > 0 ? (
              <Timeline items={timelineItems(parcel)} />
            ) : (
              <p className="text-body-sm text-grey-600">No updates yet.</p>
            )}
          </CardContent>
        </Card>
      }
    >
      {isFinished(parcel.status) ? (
        <OutcomeCard parcel={parcel} />
      ) : (
        <Card aria-labelledby="parcel-next">
          <CardHeader titleId="parcel-next" title="Next step" />
          <CardContent className="flex flex-col gap-4">
            <NextStepText parcel={parcel} />
            <StatusActions parcel={parcel} onUpdated={setParcel} onConflict={reload} />
          </CardContent>
        </Card>
      )}

      {stopFirst === "pickup" ? contactCards : [...contactCards].reverse()}

      <Card aria-labelledby="parcel-details">
        <CardHeader titleId="parcel-details" title="Parcel" />
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
            <dt className="text-grey-600">Weight</dt>
            <dd className="tabular-nums">{formatWeight(parcel.weightKg)}</dd>
            <dt className="text-grey-600">Cash on delivery</dt>
            <dd className="tabular-nums">{parcel.codAmount !== null ? formatRs(parcel.codAmount) : "Already paid"}</dd>
            <dt className="text-grey-600">Instructions</dt>
            <dd className="min-w-0 break-words">{parcel.instructions ?? "None"}</dd>
            {parcel.assignedAt ? (
              <>
                <dt className="text-grey-600">Assigned</dt>
                <dd className="tabular-nums">{formatDateTime(parcel.assignedAt)}</dd>
              </>
            ) : null}
            <dt className="text-grey-600">Last update</dt>
            <dd className="tabular-nums">{formatDateTime(parcel.updatedAt)}</dd>
          </dl>
        </CardContent>
      </Card>
    </DetailPage>
  );
}

function NextStepText({ parcel }: { parcel: Detail }) {
  const { pickup, recipient } = parcel;
  let text: string;
  switch (parcel.status) {
    case "CREATED":
      text = `Collect the parcel from ${pickup.name} in ${pickup.city}.`;
      break;
    case "OUT_FOR_DELIVERY":
      text = `Hand the parcel to ${recipient.name} in ${recipient.city}.`;
      break;
    default:
      text = `Take the parcel to ${recipient.name} in ${recipient.city}.`;
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="text-body text-grey-900">{text}</p>
      {parcel.status !== "CREATED" && parcel.codAmount !== null ? (
        <p className="text-label text-grey-900 tabular-nums">Collect {formatRs(parcel.codAmount)} in cash.</p>
      ) : null}
    </div>
  );
}

function OutcomeCard({ parcel }: { parcel: Detail }) {
  const finalEntry = parcel.history.find((entry) => entry.status === parcel.status);
  const finishedAt = finalEntry?.occurredAt ?? parcel.updatedAt;
  return (
    <Card aria-labelledby="parcel-outcome">
      <CardHeader titleId="parcel-outcome" title="Outcome" />
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
          {parcel.status === "DELIVERED" ? (
            <>
              <dt className="text-grey-600">Received by</dt>
              <dd className="min-w-0 break-words">{parcel.proof?.recipientName ?? "Not recorded"}</dd>
              <dt className="text-grey-600">Delivered</dt>
            </>
          ) : (
            <>
              <dt className="text-grey-600">Reason</dt>
              <dd>{parcel.failureReason ? failureReasonLabel(parcel.failureReason) : "Not recorded"}</dd>
              <dt className="text-grey-600">Marked failed</dt>
            </>
          )}
          <dd className="tabular-nums">{formatDateTime(finishedAt)}</dd>
          {finalEntry?.note ? (
            <>
              <dt className="text-grey-600">Note</dt>
              <dd className="min-w-0 break-words">{finalEntry.note}</dd>
            </>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}

function timelineItems(parcel: Detail): TimelineItem[] {
  return parcel.history.map((entry, index) => {
    const description = [entry.failureReason ? failureReasonLabel(entry.failureReason) : null, entry.note]
      .filter(Boolean)
      .join(" · ");
    return {
      id: `${index}-${entry.status}-${entry.occurredAt}`,
      title: PARCEL_STATUS_LABEL[entry.status],
      description: description || undefined,
      timestamp: entry.occurredAt,
      tone: entry.status === "DELIVERED" ? "success" : entry.status === "FAILED" ? "error" : "default",
    };
  });
}

function LoadingDetail() {
  return (
    <>
      <PageHeader
        {...BACK}
        title={
          <>
            <span className="sr-only">Loading parcel</span>
            <span aria-hidden="true" className="block h-8 w-56 max-w-full animate-pulse rounded-md bg-grey-100" />
          </>
        }
      />
      <div aria-hidden="true" className="flex flex-col gap-6">
        {[0, 1].map((card) => (
          <Card key={card} className="flex flex-col gap-3 p-4 sm:p-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="h-4 w-48" />
          </Card>
        ))}
      </div>
    </>
  );
}
