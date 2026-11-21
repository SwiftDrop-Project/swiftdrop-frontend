import * as React from "react";
import { DISTRICT_COUNT } from "../lib/coverage";

const FACTS = [
  { label: "Coverage", value: `${DISTRICT_COUNT} districts`, detail: "A branch in every district" },
  { label: "Tracking", value: "Every step", detail: "From pickup to delivery, with email updates" },
  { label: "Pricing", value: "Fee upfront", detail: "See the full fee before you confirm" },
  { label: "Cash on delivery", value: "Up to Rs. 500,000", detail: "Collected from the recipient for you" },
];

/** Four plain facts in one bordered strip, split by 1px dividers. */
export function LandingFacts() {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-grey-200 bg-grey-200 sm:grid-cols-2 lg:grid-cols-4">
      {FACTS.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-1 bg-white px-5 py-5 sm:px-6">
          <dt className="text-caption text-grey-600">{fact.label}</dt>
          <dd className="flex flex-col gap-1">
            <span className="text-h2 text-grey-900 tabular-nums">{fact.value}</span>
            <span className="text-body-sm text-grey-600">{fact.detail}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
