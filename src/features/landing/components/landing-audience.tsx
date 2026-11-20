import { Check } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { SiteContainer } from "@/components/layout/site-container";
import { Button } from "@/components/ui/button";

const CUSTOMER_POINTS = [
  "Book a doorstep pickup online",
  "See the full delivery fee before you confirm",
  "Track every parcel live with its tracking number",
  "Receive email updates at each status change",
  "Cash on delivery up to LKR 500,000",
];

const BUSINESS_POINTS = [
  "Register a business account for your company",
  "Review and approval by SwiftDrop before activation",
  "Manage API keys from the merchant dashboard",
  "Receive webhook status updates in your system",
];

export function LandingAudience() {
  return (
    <section aria-labelledby="audience-heading" className="border-b border-grey-200 bg-white">
      <SiteContainer className="py-12 sm:py-16">
        <div className="flex flex-col gap-1">
          <h2 id="audience-heading" className="text-h2 text-grey-900">
            For customers and businesses
          </h2>
          <p className="max-w-2xl text-body text-grey-600">
            Choose an individual customer account or register a business account.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-lg border border-grey-200 bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-4">
              <h3 className="text-h3 text-grey-900">For customers</h3>
              <ul className="flex flex-col gap-2.5 text-body-sm text-grey-700">
                {CUSTOMER_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-5 shrink-0 text-grey-700" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <Button asChild variant="secondary" size="lg">
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-grey-200 bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-4">
              <h3 className="text-h3 text-grey-900">For businesses</h3>
              <ul className="flex flex-col gap-2.5 text-body-sm text-grey-700">
                {BUSINESS_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-5 shrink-0 text-grey-700" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <Button asChild variant="secondary" size="lg">
                <Link href="/register?type=business">Register a business</Link>
              </Button>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
