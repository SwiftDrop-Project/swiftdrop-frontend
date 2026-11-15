import * as React from "react";
import { SiteContainer } from "@/components/layout/site-container";

const STEPS = [
  {
    step: "1",
    title: "Book a delivery",
    description: "Book a delivery online, see the fee before you confirm, and we collect it from your door.",
  },
  {
    step: "2",
    title: "It moves through our branches",
    description: "Sorted at your branch and sent across our district branches to the destination branch.",
  },
  {
    step: "3",
    title: "It's delivered",
    description: "Follow every step live with your tracking number and get an email at each status change.",
  },
];

export function LandingHowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="border-b border-grey-200 bg-grey-50">
      <SiteContainer className="py-12 sm:py-16">
        <div className="flex flex-col gap-1">
          <h2 id="how-it-works-heading" className="text-h2 text-grey-900">
            How it works
          </h2>
          <p className="max-w-2xl text-body text-grey-600">
            Doorstep pickup to doorstep delivery across our 25 district branches.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step} className="flex flex-col gap-3 rounded-lg border border-grey-200 bg-white p-6">
              <span className="flex size-8 items-center justify-center rounded-md bg-grey-100 text-label font-semibold text-grey-900">
                {item.step}
              </span>
              <h3 className="text-h3 text-grey-900">{item.title}</h3>
              <p className="text-body-sm text-grey-600">{item.description}</p>
            </div>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
