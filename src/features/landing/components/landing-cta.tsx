import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { LandingContainer } from "./landing-container";

export function LandingCta() {
  return (
    <section aria-labelledby="cta-heading" className="bg-white">
      <LandingContainer className="py-12 sm:py-16 lg:py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-grey-200 p-6 sm:p-8 md:flex-row md:items-center lg:p-10">
          <div className="flex max-w-2xl flex-col gap-2">
            <h2 id="cta-heading" className="text-h1 text-grey-900">
              Ready to send a parcel?
            </h2>
            <p className="text-body text-grey-600">
              Create an account to book a doorstep pickup and follow all your parcels in one place.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">Create account</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
