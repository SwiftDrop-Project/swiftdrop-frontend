"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { TextLink } from "@/components/ui/text-link";
import { TrackingSearchForm } from "@/features/tracking";
import { LandingBookingChecklist } from "./landing-booking-checklist";
import { LandingContainer } from "./landing-container";
import { LandingFacts } from "./landing-facts";

export function LandingHero() {
  return (
    <section aria-labelledby="hero-heading" className="border-b border-grey-200 bg-white">
      <LandingContainer className="py-10 sm:py-14 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16 2xl:gap-24">
          {/* Left: heading, tracking form (the one primary action), help link */}
          <div className="flex min-w-0 flex-col">
            <Badge tone="neutral" dot={false}>
              Courier service across Sri Lanka
            </Badge>

            <h1 id="hero-heading" className="mt-4 max-w-xl text-h1 text-balance text-grey-900 sm:text-display">
              Send and track parcels across Sri Lanka
            </h1>
            <p className="mt-3 max-w-2xl text-body text-grey-600">
              Doorstep pickup and delivery through our branches in all 25 districts, with live tracking from booking to
              delivery.
            </p>

            <div className="mt-8 w-full max-w-2xl rounded-lg border border-grey-200 bg-white p-4 sm:p-6">
              <h2 className="mb-4 text-h3 text-grey-900">Track a parcel</h2>
              <TrackingSearchForm hrefFor={(number) => `/track/${number}`} />
            </div>

            <p className="mt-4 text-body-sm text-grey-600">
              No account needed to track. Questions about a delivery? <TextLink href="/help">Visit Help</TextLink>
            </p>
          </div>

          {/* Right: what you need to book (stacks below on smaller screens) */}
          <div className="min-w-0">
            <LandingBookingChecklist />
          </div>
        </div>

        <div className="mt-12 lg:mt-16">
          <LandingFacts />
        </div>
      </LandingContainer>
    </section>
  );
}
