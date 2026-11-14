import * as React from "react";

export function LandingCoverage() {
  return (
    <section aria-labelledby="coverage-heading">
      <div className="rounded-lg border border-grey-200 bg-grey-50 p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 id="coverage-heading" className="text-h2 text-grey-900">
            All 25 districts
          </h2>
          <p className="max-w-3xl text-body text-grey-600">
            SwiftDrop maintains a dedicated operational branch in every district of Sri Lanka,
            connecting local couriers and businesses for prompt nationwide delivery.
          </p>
        </div>
      </div>
    </section>
  );
}

