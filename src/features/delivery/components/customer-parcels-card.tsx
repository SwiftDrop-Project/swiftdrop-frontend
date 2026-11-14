"use client";

import { Package, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextLink } from "@/components/ui/text-link";
import { formatDate, formatTrackingNumber } from "@/lib/format";
import { useDeliveries } from "../hooks/use-deliveries";
import { CREATE_DELIVERY_HREF, deliveryHref, MY_DELIVERIES_HREF } from "../routes";

const RECENT = 5;

/**
 * The customer's parcels on the overview: the five newest with their status and a link to all of them, or, for a
 * customer who hasn't sent anything yet, the empty state with "Create delivery".
 */
export function CustomerParcelsCard() {
  const { state, retry } = useDeliveries({ page: 0, size: RECENT });
  const titleId = React.useId();

  if (state.status === "ready" && state.data.totalElements === 0) {
    return (
      <Card className="p-6 sm:p-10" aria-label="Your parcels">
        <EmptyState
          icon={Package}
          size="lg"
          title="You haven’t sent any parcels yet"
          description="Create a delivery and a rider will collect it from your address. Every parcel you send will be listed here with its latest status."
          actions={
            <>
              <Button asChild>
                <Link href={CREATE_DELIVERY_HREF}>
                  <Plus aria-hidden="true" />
                  Create delivery
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/customer/addresses">Add a pickup address</Link>
              </Button>
            </>
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
          state.status === "ready" ? (
            <TextLink href={MY_DELIVERIES_HREF} className="text-label">
              View all
            </TextLink>
          ) : null
        }
      />

      {state.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading your deliveries" className="flex flex-col">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between gap-4 border-b border-grey-100 px-4 py-4 last:border-b-0 sm:px-6"
            >
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="flex flex-col items-start gap-4 p-4 sm:p-6">
          <InlineNotice tone="error" title="We couldn't load your deliveries">
            {state.message}
          </InlineNotice>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <ul className="divide-y divide-grey-100">
          {state.data.content.map((delivery) => (
            <li
              key={delivery.id}
              className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <TextLink href={deliveryHref(delivery.id)} className="text-label tabular-nums">
                  {formatTrackingNumber(delivery.trackingNumber)}
                </TextLink>
                <p className="text-body-sm text-grey-600">
                  To {delivery.recipient.name}, {delivery.recipient.city} ·{" "}
                  <span className="tabular-nums">{formatDate(delivery.createdAt)}</span>
                </p>
              </div>
              <StatusBadge status={delivery.status} className="self-start sm:self-center" />
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
