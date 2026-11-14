"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { TrackingResult } from "./tracking-result";
import { TrackingSearchForm } from "./tracking-search-form";

/** /customer/track?number=…: the tracking form inside the app, and the parcel, updated live. */
export function CustomerTracking() {
  const number = useSearchParams().get("number")?.trim() ?? "";
  return (
    <>
      <PageHeader
        title="Track a parcel"
        description="Enter a tracking number to see where the parcel is. This page updates by itself as it moves."
      />
      <div className="flex max-w-3xl flex-col gap-6">
        <Card className="p-4 sm:p-6">
          <TrackingSearchForm
            key={number}
            defaultValue={number}
            hrefFor={(value) => `/customer/track?number=${encodeURIComponent(value)}`}
          />
        </Card>
        {number ? <TrackingResult key={number} trackingNumber={number} /> : null}
      </div>
    </>
  );
}
