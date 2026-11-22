"use client";

import { Package, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PageColumns } from "@/components/layout/page-columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { formatDate, formatPhone, formatRs, formatTrackingNumber } from "@/lib/format";
import { type CustomerOverviewData, useCustomerOverview } from "../hooks/use-customer-overview";
import { CREATE_DELIVERY_HREF, deliveryHref, MY_DELIVERIES_HREF } from "../routes";
import type { Delivery } from "../types";

/*
 * The customer overview (Overview@1x.png): three figures, the newest deliveries, the last pickup address and the
 * latest delivered parcel. Everything comes from GET /deliveries. There is no addresses or receipts API yet, so the
 * side cards use the newest delivery's pickup and the latest delivered parcel; swap them for the saved default pickup
 * and the receipt download when those endpoints exist.
 */

const ADDRESSES_HREF = "/customer/addresses";

function route(delivery: Delivery): string {
  return `${delivery.pickup.city} → ${delivery.recipient.city}`;
}

/** The customer overview with its own loading and error states. Render it once the current user is known. */
export function CustomerOverview() {
  const { state, retry } = useCustomerOverview();

  if (state.status === "loading") return <CustomerOverviewSkeleton />;

  if (state.status === "error") {
    return (
      <Card className="flex flex-col items-start gap-4 p-4 sm:p-6">
        <InlineNotice tone="error" title="We couldn't load your overview">
          {state.message}
        </InlineNotice>
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      </Card>
    );
  }

  const { data } = state;
  return (
    <div className="flex flex-col gap-6">
      <OverviewStats data={data} />
      <PageColumns
        aside={
          <>
            <LastPickupCard delivery={data.recent[0] ?? null} />
            <LatestDeliveredCard delivery={data.latestDelivered} />
          </>
        }
      >
        <RecentDeliveriesCard deliveries={data.recent} />
      </PageColumns>
    </div>
  );
}

function OverviewStats({ data }: { data: CustomerOverviewData }) {
  const stats = [
    {
      label: "Active deliveries",
      value: data.active,
      note:
        data.outForDelivery > 0
          ? `${data.outForDelivery} out for delivery now`
          : data.active > 0
            ? "On the way to their recipients"
            : "Nothing on the way right now",
    },
    {
      label: "Delivered",
      value: data.delivered,
      note: data.latestDelivered
        ? `Latest on ${formatDate(data.latestDelivered.updatedAt)}`
        : "No parcels delivered yet",
    },
    {
      label: "All deliveries",
      value: data.total,
      note: "Booked from your account",
    },
  ];

  return (
    <section aria-label="Delivery summary">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-1 p-5">
            <dt className="text-label text-grey-700">{stat.label}</dt>
            <dd className="flex flex-col gap-1">
              <span className="text-display text-grey-900 tabular-nums">{stat.value}</span>
              <span className="text-body-sm text-grey-600">{stat.note}</span>
            </dd>
          </Card>
        ))}
      </dl>
    </section>
  );
}

function RecentDeliveriesCard({ deliveries }: { deliveries: Delivery[] }) {
  const titleId = React.useId();

  if (deliveries.length === 0) {
    return (
      <Card className="p-6 sm:p-10" aria-label="Recent deliveries">
        <EmptyState
          icon={Package}
          size="lg"
          title="You haven’t sent any parcels yet"
          description="Create a delivery and a rider will collect it from your address. Your newest parcels will be listed here with their latest status."
          actions={
            <Button asChild>
              <Link href={CREATE_DELIVERY_HREF}>
                <Plus aria-hidden="true" />
                Create delivery
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Recent deliveries"
        titleId={titleId}
        aside={
          <TextLink href={MY_DELIVERIES_HREF} className="text-label">
            View all
          </TextLink>
        }
      />

      {/* Phones: a list */}
      <ul className="divide-y divide-grey-100 md:hidden">
        {deliveries.map((delivery) => (
          <li key={delivery.id} className="flex flex-col gap-2 px-4 py-4">
            <TextLink href={deliveryHref(delivery.id)} className="text-label tabular-nums">
              {formatTrackingNumber(delivery.trackingNumber)}
            </TextLink>
            <p className="text-body-sm text-grey-600">{route(delivery)}</p>
            <StatusBadge status={delivery.status} className="self-start" />
          </li>
        ))}
      </ul>

      {/* Tablet and up: a table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking number</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell>
                  <TextLink href={deliveryHref(delivery.id)} className="text-label tabular-nums">
                    {formatTrackingNumber(delivery.trackingNumber)}
                  </TextLink>
                </TableCell>
                <TableCell className="text-grey-700">{route(delivery)}</TableCell>
                <TableCell>
                  <StatusBadge status={delivery.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/** The pickup of the newest delivery: the address riders collected from most recently. */
function LastPickupCard({ delivery }: { delivery: Delivery | null }) {
  const titleId = React.useId();
  return (
    <Card aria-labelledby={titleId}>
      <CardContent className="flex flex-col gap-3">
        <h2 id={titleId} className="text-h3 text-grey-900">
          Last pickup address
        </h2>
        {delivery ? (
          <address className="flex flex-col gap-1 text-body text-grey-700 not-italic">
            <span className="text-label text-grey-900">{delivery.pickup.name}</span>
            <span>{delivery.pickup.addressLine}</span>
            <span>{delivery.pickup.city}</span>
            <span className="tabular-nums">{formatPhone(delivery.pickup.phone)}</span>
          </address>
        ) : (
          <p className="text-body-sm text-grey-600">
            Your pickup address will show here after your first delivery.
          </p>
        )}
        <TextLink href={ADDRESSES_HREF} className="w-fit text-label">
          Manage addresses
        </TextLink>
      </CardContent>
    </Card>
  );
}

/** The most recently delivered parcel and the fee charged for it. */
function LatestDeliveredCard({ delivery }: { delivery: Delivery | null }) {
  const titleId = React.useId();
  return (
    <Card aria-labelledby={titleId}>
      <CardContent className="flex flex-col gap-3">
        <h2 id={titleId} className="text-h3 text-grey-900">
          Latest delivered parcel
        </h2>
        {delivery ? (
          <>
            <dl className="flex items-baseline justify-between gap-4">
              <dt className="text-body text-grey-700 tabular-nums">
                <span className="sr-only">Tracking number </span>
                {formatTrackingNumber(delivery.trackingNumber)}
              </dt>
              <dd className="text-label text-grey-900 tabular-nums">
                <span className="sr-only">Fee </span>
                {formatRs(delivery.feeAmount)}
              </dd>
            </dl>
            <p className="text-body-sm text-grey-600">
              Delivered on <span className="tabular-nums">{formatDate(delivery.updatedAt)}</span>
            </p>
            <Button asChild variant="secondary" className="w-full">
              <Link href={deliveryHref(delivery.id)}>View delivery</Link>
            </Button>
          </>
        ) : (
          <p className="text-body-sm text-grey-600">Your delivered parcels and their fees will show here.</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Placeholder with the overview's shape, while the current user or the figures load. */
export function CustomerOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading your overview">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((tile) => (
          <Card key={tile} className="flex flex-col gap-3 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-4 w-40 max-w-full" />
          </Card>
        ))}
      </div>
      <PageColumns
        aside={
          <>
            <Card className="flex flex-col gap-3 p-4 sm:p-6">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-20 w-full" />
            </Card>
            <Card className="flex flex-col gap-3 p-4 sm:p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
            </Card>
          </>
        }
      >
        <Card>
          <div className="border-b border-grey-200 px-4 py-4 sm:px-6">
            <Skeleton className="h-6 w-40" />
          </div>
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between gap-4 border-b border-grey-100 px-4 py-4 last:border-b-0 sm:px-6"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </Card>
      </PageColumns>
    </div>
  );
}
