"use client";

import * as React from "react";
import { TrackingSearchForm } from "@/features/tracking";

export function LandingHero() {
  return (
    <section aria-labelledby="hero-heading" className="pt-4 sm:pt-8">
      <div className="flex flex-col gap-3">
        <h1 id="hero-heading" className="text-h1 sm:text-display text-grey-900">
          Send and track parcels across Sri Lanka
        </h1>
        <p className="max-w-2xl text-body text-grey-600">
          Doorstep pickup and delivery across all 25 districts with live tracking at every step.
        </p>
      </div>

      <div className="mt-8 max-w-form-app rounded-lg border border-grey-200 bg-white p-6 sm:p-8">
        <TrackingSearchForm hrefFor={(number) => `/track/${number}`} />
      </div>
    </section>
  );
}

