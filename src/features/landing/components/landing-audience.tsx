import { Check } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { LandingContainer } from "./landing-container";

const CUSTOMER_POINTS = [
  "Book a doorstep pickup online",
  "See the full delivery fee before you confirm",
  "Track every parcel live with its tracking number",
  "Receive email updates at each status change",
  "Cash on delivery up to Rs. 500,000",
];

const BUSINESS_POINTS = [
  "Register a business account for your company",
  "SwiftDrop reviews and approves it before activation",
  "Manage API keys from the merchant dashboard",
  "Receive webhook status updates in your system",
];

function PointList({ points }: { points: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 text-body-sm text-grey-700">
      {points.map((point) => (
        <li key={point} className="flex items-start gap-2.5">
          <Check className="mt-0.5 size-5 shrink-0 text-grey-700" aria-hidden="true" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

export function LandingAudience() {
  return (
    <section aria-labelledby="audience-heading" className="border-b border-grey-200 bg-grey-50">
      <LandingContainer className="py-12 sm:py-16 lg:py-20">
        <div className="flex flex-col gap-3">
          <h2 id="audience-heading" className="text-h1 text-grey-900">
            For customers and businesses
          </h2>
          <p className="max-w-2xl text-body text-grey-600">
            Send your own parcels with a customer account, or connect your shop or company with a business account.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article
            aria-labelledby="audience-customers"
            className="flex flex-col justify-between gap-8 rounded-lg border border-grey-200 bg-white p-6 sm:p-8"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-caption text-grey-600">Customer account</span>
                <h3 id="audience-customers" className="text-h2 text-grey-900">
                  Send parcels from home
                </h3>
              </div>
              <PointList points={CUSTOMER_POINTS} />
            </div>
            <div>
              <Button asChild variant="secondary" size="lg">
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          </article>

          <article
            aria-labelledby="audience-businesses"
            className="flex flex-col justify-between gap-8 rounded-lg border border-grey-200 bg-white p-6 sm:p-8"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-caption text-grey-600">Business account</span>
                <h3 id="audience-businesses" className="text-h2 text-grey-900">
                  Connect your shop or system
                </h3>
              </div>
              <PointList points={BUSINESS_POINTS} />
            </div>
            <div>
              <Button asChild variant="secondary" size="lg">
                <Link href="/register?type=business">Register a business</Link>
              </Button>
            </div>
          </article>
        </div>
      </LandingContainer>
    </section>
  );
}
