"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { MyParcelsLive } from "./my-parcels-live";
import { TrackingResult } from "./tracking-result";
import { TrackingSearchForm } from "./tracking-search-form";

const hrefFor = (value: string) => `/customer/track?number=${encodeURIComponent(value)}`;

/**
 * /customer/track?number=…: the tracking form inside the app, the parcel updated live, and the customer's own parcels
 * (updated live over their private channel).
 */
export function CustomerTracking() {
  const number = useSearchParams().get("number")?.trim() ?? "";
  return (
    <>
      <PageHeader
        title="Track a parcel"
        description="Enter a tracking number, or pick one of your parcels, to see where it is. This page updates by itself as parcels move."
      />
      <div className="flex max-w-3xl flex-col gap-6">
        <Card className="p-4 sm:p-6">
          <TrackingSearchForm
            key={number}
            defaultValue={number}
            hrefFor={hrefFor}
          />
        </Card>
        {number ? <TrackingResult key={number} trackingNumber={number} /> : null}
        <MyParcelsLive hrefFor={hrefFor} />
      </div>
    </>
  );
}
