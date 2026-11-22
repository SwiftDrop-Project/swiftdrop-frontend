import * as React from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextLink } from "@/components/ui/text-link";
import type { ParcelStatus } from "@/types";
import { LandingContainer } from "./landing-container";

const STEPS: { title: string; description: string; statuses: ParcelStatus[] }[] = [
  {
    title: "Book a delivery",
    description:
      "Book online with the pickup address, recipient and parcel weight. You see the full fee before you confirm, and a courier collects the parcel from your door.",
    statuses: ["CREATED", "PICKED_UP"],
  },
  {
    title: "It moves through our branches",
    description:
      "The parcel is sorted at the branch in your district and sent on to the branch in the recipient's district.",
    statuses: ["AT_BRANCH", "IN_TRANSIT"],
  },
  {
    title: "It's delivered",
    description:
      "A courier from the destination branch takes it to the recipient. You get an email at every status change.",
    statuses: ["OUT_FOR_DELIVERY", "DELIVERED"],
  },
];

/** The delivery journey, step by step, with the statuses each step shows on the tracking page. */
export function LandingHowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="border-b border-grey-200 bg-grey-50">
      <LandingContainer className="py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-3 lg:col-span-4">
            <h2 id="how-it-works-heading" className="text-h1 text-grey-900">
              How a delivery works
            </h2>
            <p className="max-w-md text-body text-grey-600">
              From your door to the recipient&apos;s door through our district branches. Each step shows on the
              tracking page with the status below it.
            </p>
            <p className="text-body-sm">
              <TextLink href="/track">Track a parcel</TextLink>
            </p>
          </div>

          <ol className="flex flex-col lg:col-span-8">
            {STEPS.map((step, index) => {
              const last = index === STEPS.length - 1;
              return (
                <li key={step.title} className="relative flex gap-5 pb-10 last:pb-0">
                  {!last ? (
                    <span aria-hidden="true" className="absolute top-10 bottom-0 left-4 w-px -translate-x-1/2 bg-grey-300" />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-grey-300 bg-white text-label font-semibold text-grey-900 tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-2 pt-1">
                    <h3 className="text-h3 text-grey-900">
                      <span className="sr-only">Step {index + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="max-w-xl text-body-sm text-grey-600">{step.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="sr-only">Statuses shown:</span>
                      {step.statuses.map((status) => (
                        <StatusBadge key={status} status={status} />
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </LandingContainer>
    </section>
  );
}
