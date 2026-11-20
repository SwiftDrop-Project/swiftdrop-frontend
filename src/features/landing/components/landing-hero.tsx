"use client";

import { Banknote, MapPin, Navigation, Receipt } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { BrandPanel } from "@/components/layout/auth-split-layout";
import { SiteContainer } from "@/components/layout/site-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrackingSearchForm } from "@/features/tracking";

const KEY_FACTS = [
  { icon: MapPin, label: "Branches in all 25 districts" },
  { icon: Navigation, label: "Live tracking at every step" },
  { icon: Receipt, label: "See the fee before you book" },
  { icon: Banknote, label: "Cash on delivery available" },
];

export function LandingHero() {
  return (
    <section aria-labelledby="hero-heading" className="border-b border-grey-200 bg-white">
      <SiteContainer className="py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left column: heading, actions, tracking form */}
          <div className="flex flex-col">
            <Badge tone="neutral" dot={false}>
              Courier service across Sri Lanka
            </Badge>

            <h1 id="hero-heading" className="mt-4 text-h1 text-grey-900 sm:text-display">
              Send and track parcels across Sri Lanka
            </h1>
            <p className="mt-3 max-w-xl text-body text-grey-600">
              Doorstep pickup and delivery through our district branches, with live tracking from booking to delivery.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">Create account</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/register?type=business">Register a business</Link>
              </Button>
            </div>

            <div className="mt-8 rounded-lg border border-grey-200 bg-grey-50 p-4 sm:p-6">
              <TrackingSearchForm hrefFor={(number) => `/track/${number}`} />
            </div>
          </div>

          {/* Right column (lg+): orange brand panel matching the auth layout */}
          <BrandPanel className="hidden h-full rounded-lg px-12 py-12 lg:flex" />
        </div>

        {/* 4 short facts row */}
        <ul className="mt-10 grid grid-cols-1 gap-4 border-t border-grey-200 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {KEY_FACTS.map((fact) => {
            const Icon = fact.icon;
            return (
              <li key={fact.label} className="flex items-center gap-3 text-body-sm font-medium text-grey-800">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-grey-200 bg-grey-50 text-grey-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>{fact.label}</span>
              </li>
            );
          })}
        </ul>
      </SiteContainer>
    </section>
  );
}
