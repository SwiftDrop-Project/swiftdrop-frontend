import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";

export function LandingAudience() {
  return (
    <section aria-labelledby="audience-heading">
      <div className="flex flex-col gap-1">
        <h2 id="audience-heading" className="text-h2 text-grey-900">
          Built for customers and businesses
        </h2>
        <p className="text-body text-grey-600">
          Reliable delivery options designed for both personal senders and commercial merchants.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Customer card */}
        <div className="flex flex-col justify-between rounded-lg border border-grey-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-3">
            <h3 className="text-h3 text-grey-900">For customers</h3>
            <p className="text-body-sm text-grey-600">
              Book a parcel pickup in minutes, see the exact delivery fee before you confirm, track
              your package live, and receive status notifications by email.
            </p>
          </div>
          <div className="mt-6">
            <Button asChild variant="secondary">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>

        {/* Business card */}
        <div className="flex flex-col justify-between rounded-lg border border-grey-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-3">
            <h3 className="text-h3 text-grey-900">For businesses</h3>
            <p className="text-body-sm text-grey-600">
              Create orders directly from your store or internal system using an API key, manage bulk
              shipments, and receive automated real-time status updates via webhooks.
            </p>
          </div>
          <div className="mt-6">
            <Button asChild variant="secondary">
              <Link href="/register">Register a business</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

