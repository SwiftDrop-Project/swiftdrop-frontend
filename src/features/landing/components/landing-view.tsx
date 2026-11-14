import * as React from "react";
import { LandingAudience } from "./landing-audience";
import { LandingCoverage } from "./landing-coverage";
import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingHowItWorks } from "./landing-how-it-works";

export function LandingView() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LandingHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto flex max-w-content flex-col gap-12 px-4 py-8 sm:gap-16 sm:px-8 sm:py-12">
          <LandingHero />
          <LandingHowItWorks />
          <LandingAudience />
          <LandingCoverage />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

