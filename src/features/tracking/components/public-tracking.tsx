"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { formatTrackingNumber } from "@/lib/format";
import { TrackingResult } from "./tracking-result";
import { TrackingSearchForm } from "./tracking-search-form";

const trackHref = (number: string) => `/track/${number}`;

function Intro() {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <h1 className="text-h2 text-grey-900">Track a parcel</h1>
      <p className="text-body text-grey-600">
        Enter the tracking number to see where the parcel is. The page updates by itself as it moves.
      </p>
    </div>
  );
}

function AccountLink() {
  return (
    <p className="mt-8 text-body-sm text-grey-600">
      Sent the parcel?{" "}
      <Link href="/login" className="text-orange-700 hover:text-orange-800 hover:underline">
        Log in
      </Link>{" "}
      to see all your deliveries.
    </p>
  );
}

/** /track: the tracking-number form, no login needed. */
export function PublicTrackingSearch() {
  return (
    <>
      <Intro />
      <TrackingSearchForm hrefFor={trackHref} />
      <AccountLink />
    </>
  );
}

/** /track/[trackingNumber]: one parcel, updated live, with the form to look up another. */
export function PublicTrackingResult({ trackingNumber }: { trackingNumber?: string }) {
  const params = useParams<{ trackingNumber?: string }>();
  const number = decodeURIComponent(trackingNumber ?? params.trackingNumber ?? "");
  return (
    <>
      <Intro />
      <div className="mb-6">
        <TrackingSearchForm key={number} hrefFor={trackHref} defaultValue={number} submitLabel="Track another" />
      </div>
      {number ? (
        <TrackingResult key={number} trackingNumber={number} />
      ) : (
        <p className="text-body text-grey-600">Enter a tracking number, like {formatTrackingNumber("SD2611004817")}.</p>
      )}
      <AccountLink />
    </>
  );
}
