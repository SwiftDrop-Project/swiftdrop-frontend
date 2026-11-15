import Link from "next/link";
import * as React from "react";
import { SiteContainer } from "@/components/layout/site-container";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section aria-labelledby="cta-heading" className="bg-grey-50">
      <SiteContainer className="flex flex-col items-start justify-between gap-6 py-12 sm:py-16 md:flex-row md:items-center">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 id="cta-heading" className="text-h2 text-grey-900">
            Ready to send a parcel?
          </h2>
          <p className="text-body text-grey-600">
            Create an account to book a doorstep pickup, or track an existing parcel.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/register">Create account</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/track">Track a parcel</Link>
          </Button>
        </div>
      </SiteContainer>
    </section>
  );
}
