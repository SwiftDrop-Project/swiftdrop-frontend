import * as React from "react";
import { DISTRICT_COUNT, PROVINCES } from "../lib/coverage";
import { LandingContainer } from "./landing-container";

/** Every district with a branch, grouped by province. */
export function LandingCoverage() {
  return (
    <section aria-labelledby="coverage-heading" className="border-b border-grey-200 bg-white">
      <LandingContainer className="py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-3 lg:col-span-4">
            <h2 id="coverage-heading" className="text-h1 text-grey-900">
              Branches in all {DISTRICT_COUNT} districts
            </h2>
            <p className="max-w-md text-body text-grey-600">
              Every district has its own SwiftDrop branch. Parcels go from the branch in the sender&apos;s district to
              the branch in the recipient&apos;s district.
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-grey-200 bg-grey-200 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
            {PROVINCES.map((province) => (
              <li key={province.name} className="flex flex-col gap-2 bg-white p-5">
                <h3 className="text-label text-grey-900">{province.name} Province</h3>
                <p className="text-body-sm text-grey-600">{province.districts.join(", ")}</p>
              </li>
            ))}
          </ul>
        </div>
      </LandingContainer>
    </section>
  );
}
