import * as React from "react";
import { LandingAudience } from "./landing-audience";
import { LandingCta } from "./landing-cta";
import { LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingHowItWorks } from "./landing-how-it-works";

export function LandingView() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-white">
      <LandingHeader />
      <main id="main" className="flex-1">
        <LandingHero />
        <LandingHowItWorks />
        <LandingAudience />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
