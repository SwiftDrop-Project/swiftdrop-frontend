"use client";

import * as React from "react";
import { FormPage } from "@/components/layout/form-page";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { PARCEL_STATUS_LABEL } from "@/components/ui/status-badge";
import { TextLink } from "@/components/ui/text-link";
import { formatTrackingNumber } from "@/lib/format";
import { useCourierDelivery } from "../hooks/use-courier-delivery";
import { courierRoutes } from "../lib/labels";
import type { CourierDeliveryDetail } from "../types";
import { LoadError } from "./load-error";
import { ParcelNotFound } from "./parcel-not-found";

type Target = "DELIVERED" | "FAILED";

const TARGET_WORDS: Record<Target, string> = { DELIVERED: "delivered", FAILED: "failed" };

/**
 * The page around the Mark as delivered / Mark as failed forms. Loads the parcel first and renders the form
 * only when the server lists `target` in `nextStatuses`.
 */
export function StatusFormPage({
  parcelId,
  target,
  title,
  children,
}: {
  parcelId: string;
  target: Target;
  title: string;
  children: (parcel: CourierDeliveryDetail) => React.ReactNode;
}) {
  const { state, reload } = useCourierDelivery(parcelId);
  const back = { backHref: courierRoutes.parcel(parcelId), backLabel: "Back to parcel" };

  if (state.status === "loading") {
    return (
      <FormPage title={title} {...back}>
        <FormSkeleton />
      </FormPage>
    );
  }

  if (state.status === "error") {
    if (state.error.kind === "not-found") return <ParcelNotFound />;
    return (
      <FormPage title={title} {...back}>
        <LoadError error={state.error} title="We couldn't load this parcel" onRetry={reload} />
      </FormPage>
    );
  }

  const { parcel } = state;
  const summary = (
    <>
      <span className="tabular-nums">{formatTrackingNumber(parcel.trackingNumber)}</span> · To{" "}
      {parcel.recipient.name}, {parcel.recipient.city}
    </>
  );

  if (!parcel.nextStatuses.includes(target)) {
    return (
      <FormPage title={title} description={summary} {...back}>
        <InlineNotice title={`This parcel can't be marked as ${TARGET_WORDS[target]} now`}>
          It&apos;s {PARCEL_STATUS_LABEL[parcel.status].toLowerCase()}.{" "}
          <TextLink href={courierRoutes.parcel(parcelId)}>Back to parcel</TextLink>
        </InlineNotice>
      </FormPage>
    );
  }

  return (
    <FormPage title={title} description={summary} {...back}>
      {children(parcel)}
    </FormPage>
  );
}

function FormSkeleton() {
  return (
    <>
      <span className="sr-only" role="status">
        Loading parcel
      </span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-6 w-40" />
        {[0, 1].map((field) => (
          <div key={field} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
        <Skeleton className="h-12 w-full sm:w-44" />
      </div>
    </>
  );
}
