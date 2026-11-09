"use client";

import { PackageSearch } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { PARCEL_STATUS_LABEL, StatusBadge } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { useDistricts } from "@/hooks/use-districts";
import { formatDateTime, formatPhone, formatRs, formatTrackingNumber, humanizeCode } from "@/lib/format";
import { useDelivery } from "../hooks/use-deliveries";
import { FAILURE_REASON_LABEL } from "../labels";
import { MY_DELIVERIES_HREF } from "../routes";
import type { Delivery, DeliveryContact, DeliveryHistoryEntry } from "../types";
import { SummaryCard, type SummaryRow } from "./summary-card";

const BACK = { backHref: MY_DELIVERIES_HREF, backLabel: "My deliveries" };

type DistrictName = (code: string) => string;

/**
 * One of the customer's deliveries (GET /deliveries/{id}): where it is now, the recipient, the pickup and the
 * parcel, with its history as a timeline. Someone else's delivery or a wrong link shows "not found".
 */
export function DeliveryDetail({ id }: { id: string }) {
  const { state, retry } = useDelivery(id);
  const districts = useDistricts();
  const districtName: DistrictName = (code) =>
    districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code);

  if (state.status === "loading") {
    return (
      <DetailPage title="Delivery" {...BACK}>
        <div aria-busy="true" aria-label="Loading the delivery" className="flex flex-col gap-6">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </DetailPage>
    );
  }

  if (state.status === "not-found") {
    return (
      <DetailPage title="Delivery not found" {...BACK}>
        <Card className="p-6 sm:p-10">
          <EmptyState
            icon={PackageSearch}
            title="We couldn't find this delivery"
            description="Check the link, or open the parcel from your list of deliveries."
            actions={
              <Button asChild variant="secondary">
                <Link href={MY_DELIVERIES_HREF}>Go to my deliveries</Link>
              </Button>
            }
          />
        </Card>
      </DetailPage>
    );
  }

  if (state.status === "error") {
    return (
      <DetailPage title="Delivery" {...BACK}>
        <div className="flex flex-col items-start gap-4">
          <InlineNotice tone="error" title="We couldn't load this delivery">
            {state.message}
          </InlineNotice>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      </DetailPage>
    );
  }

  const { delivery, history } = state.data;

  return (
    <DetailPage
      title={formatTrackingNumber(delivery.trackingNumber)}
      description={`Booked ${formatDateTime(delivery.createdAt)}`}
      status={<StatusBadge status={delivery.status} />}
      aside={<HistoryCard history={history} districtName={districtName} />}
      {...BACK}
    >
      <WhereItIs delivery={delivery} districtName={districtName} />
      <SummaryCard title="Recipient" rows={contactRows(delivery.recipient, districtName)} />
      <SummaryCard title="Pickup" rows={contactRows(delivery.pickup, districtName)} />
      <SummaryCard
        title="Parcel"
        rows={[
          { label: "Weight", value: `${delivery.weightKg} kg`, tabular: true },
          {
            label: "Cash on delivery",
            value: delivery.codAmount === null ? "None, already paid" : formatRs(delivery.codAmount),
            tabular: delivery.codAmount !== null,
          },
          { label: "Delivery fee", value: formatRs(delivery.feeAmount), tabular: true },
          { label: "Instructions", value: delivery.instructions ?? "None" },
          { label: "Last update", value: formatDateTime(delivery.updatedAt), tabular: true },
        ]}
      />
    </DetailPage>
  );
}

/** A notice for the statuses that need a word of explanation: at a branch, delivered, or a failed attempt. */
function WhereItIs({ delivery, districtName }: { delivery: Delivery; districtName: DistrictName }) {
  if (delivery.status === "AT_BRANCH" && delivery.currentBranch) {
    return (
      <InlineNotice title={`At the ${districtName(delivery.currentBranch)} branch`}>
        From here it goes on to another branch, or out for delivery.
      </InlineNotice>
    );
  }
  if (delivery.status === "DELIVERED") {
    const name = delivery.proof?.recipientName;
    return (
      <InlineNotice tone="success" title="Delivered">
        {name ? `Received by ${name}.` : "The parcel was handed over."}
      </InlineNotice>
    );
  }
  if (delivery.status === "FAILED") {
    const reason = delivery.failureReason ? `${FAILURE_REASON_LABEL[delivery.failureReason]}. ` : "";
    return (
      <InlineNotice tone="error" title="The last delivery attempt failed">
        {reason}The parcel goes back to a branch for another try.
      </InlineNotice>
    );
  }
  return null;
}

function HistoryCard({ history, districtName }: { history: DeliveryHistoryEntry[]; districtName: DistrictName }) {
  const titleId = React.useId();
  return (
    <Card aria-labelledby={titleId}>
      <CardHeader title="History" titleId={titleId} />
      <CardContent>
        {history.length > 0 ? (
          <Timeline items={history.map((entry, index) => timelineItem(entry, index, districtName))} />
        ) : (
          <p className="text-body-sm text-grey-600">No updates yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

/** "At branch · Gampaha branch", "Delivery failed · Recipient not available · No answer, called twice". */
function timelineItem(entry: DeliveryHistoryEntry, index: number, districtName: DistrictName): TimelineItem {
  const details = [
    entry.branch ? `${districtName(entry.branch)} branch` : null,
    entry.failureReason ? FAILURE_REASON_LABEL[entry.failureReason] : null,
    entry.note,
  ].filter((part): part is string => Boolean(part));
  return {
    id: `${entry.occurredAt}-${index}`,
    title: PARCEL_STATUS_LABEL[entry.status],
    description: details.length > 0 ? details.join(" · ") : undefined,
    timestamp: entry.occurredAt,
    tone: entry.status === "DELIVERED" ? "success" : entry.status === "FAILED" ? "error" : "default",
  };
}

function contactRows(contact: DeliveryContact, districtName: DistrictName): SummaryRow[] {
  return [
    { label: "Name", value: contact.name },
    { label: "Mobile number", value: formatPhone(contact.phone), tabular: true },
    { label: "Address", value: `${contact.addressLine}, ${contact.city}` },
    { label: "District", value: districtName(contact.district) },
  ];
}
