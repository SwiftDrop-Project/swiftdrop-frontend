"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DetailPage } from "@/components/layout/detail-page";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PARCEL_STATUS_LABEL, StatusBadge } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { formatTrackingNumber } from "@/lib/format";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import { ASSIGNMENT_TYPE_LABEL, courierRoutes, failureReasonLabel } from "../lib/labels";
import type { CourierParcelDetail } from "../types";
import { ContactDetails } from "./contact-details";
import { CourierLoadError } from "./courier-load-error";
import { OutcomeBadge } from "./task-badges";

/** /courier/parcels/[parcelId]: a parcel from one of the courier's tasks, with its history and their own items. */
export function CourierParcelView({ parcelId: idProp }: { parcelId?: string }) {
  const params = useParams<{ parcelId?: string }>();
  const parcelId = idProp ?? params.parcelId ?? "";
  const loaded = useCourierLoad(`courier-parcel:${parcelId}`, (signal) => courierApi.parcel(parcelId, signal), {
    loadingById: true,
  });
  const back = { backHref: courierRoutes.today, backLabel: "Back to today's tasks" };

  if (loaded.status === "loading") {
    return (
      <DetailPage title="Parcel" {...back}>
        <Card className="p-6" aria-busy="true" aria-label="Loading parcel">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </Card>
      </DetailPage>
    );
  }

  if (loaded.status === "error") {
    return (
      <DetailPage title="Parcel" {...back}>
        <CourierLoadError
          error={loaded.error}
          title="We couldn't load this parcel"
          notFoundTitle="This parcel isn't in your tasks"
          backHref={courierRoutes.today}
          backLabel="Go to today's tasks"
          onRetry={loaded.reload}
        />
      </DetailPage>
    );
  }

  return <ParcelReady parcel={loaded.data} />;
}

function ParcelReady({ parcel }: { parcel: CourierParcelDetail }) {
  const districtName = useDistrictName();
  // Back to the newest task that holds this parcel (myItems is newest first).
  const latest = parcel.myItems[0];
  const back = latest
    ? { backHref: courierRoutes.task(latest.assignmentId), backLabel: "Back to the task" }
    : { backHref: courierRoutes.today, backLabel: "Back to today's tasks" };

  const history: TimelineItem[] = parcel.history.map((entry, index) => ({
    id: `${index}-${entry.occurredAt}`,
    title: PARCEL_STATUS_LABEL[entry.status],
    description: entry.branch
      ? `${districtName(entry.branch)} branch`
      : entry.failureReason
        ? failureReasonLabel(entry.failureReason)
        : undefined,
    timestamp: entry.occurredAt,
    tone: entry.status === "DELIVERED" ? "success" : entry.status === "FAILED" ? "error" : "default",
  }));

  const aside = (
    <Card aria-labelledby="parcel-history-heading">
      <CardHeader title="History" titleId="parcel-history-heading" description="Newest first" />
      <CardContent>
        <Timeline items={history} />
      </CardContent>
    </Card>
  );

  return (
    <DetailPage
      title={formatTrackingNumber(parcel.trackingNumber)}
      description={`${parcel.from.city} → ${parcel.to.city}`}
      status={<StatusBadge status={parcel.status} />}
      aside={aside}
      {...back}
    >
      <div className="flex flex-col gap-6">
        <Card aria-labelledby="parcel-where-heading">
          <CardHeader title="Where it is" titleId="parcel-where-heading" />
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
              <dt className="text-grey-600">Status</dt>
              <dd>
                {PARCEL_STATUS_LABEL[parcel.status]}
                {parcel.currentBranch ? `, ${districtName(parcel.currentBranch)} branch` : ""}
              </dd>
              <dt className="text-grey-600">From</dt>
              <dd className="min-w-0 break-words">
                {parcel.from.city}, {districtName(parcel.from.district)}
              </dd>
              <dt className="text-grey-600">To</dt>
              <dd className="min-w-0 break-words">
                {parcel.to.city}, {districtName(parcel.to.district)}
              </dd>
            </dl>
          </CardContent>
        </Card>

        {parcel.contact ? (
          <Card aria-labelledby="parcel-contact-heading">
            <CardHeader title="Contact" titleId="parcel-contact-heading" />
            <CardContent>
              <ContactDetails contact={parcel.contact} districtName={districtName} />
            </CardContent>
          </Card>
        ) : null}

        <Card aria-labelledby="parcel-tasks-heading">
          <CardHeader title="Your tasks for this parcel" titleId="parcel-tasks-heading" description="Newest first" />
          <ul className="divide-y divide-grey-100">
            {parcel.myItems.map((item) => (
              <li
                key={item.assignmentId}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-body-sm sm:px-6"
              >
                <Link
                  href={courierRoutes.task(item.assignmentId)}
                  className="text-label font-semibold text-grey-900 underline-offset-4 hover:underline"
                >
                  {ASSIGNMENT_TYPE_LABEL[item.type]} task
                </Link>
                <OutcomeBadge outcome={item.outcome} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DetailPage>
  );
}
