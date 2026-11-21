import { Banknote, MapPin, Package, UserRound } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";

/** Matches the fields and limits of the Create delivery form (features/delivery/schemas.ts). */
const ITEMS = [
  {
    icon: MapPin,
    title: "Your pickup details",
    detail: "Your name, mobile number and the address, city and district where our courier collects the parcel.",
  },
  {
    icon: UserRound,
    title: "The recipient's details",
    detail: "Their name, mobile number and delivery address, city and district.",
  },
  {
    icon: Package,
    title: "Parcel weight and size",
    detail: "Up to 50 kg and 300 cm a side. These set the fee you see before you confirm.",
  },
  {
    icon: Banknote,
    title: "Cash on delivery amount",
    detail: "Up to Rs. 500,000, collected from the recipient. Leave it empty if the parcel is already paid for.",
    optional: true,
  },
];

/** "What you need to book a pickup": a practical checklist beside the hero's tracking form. */
export function LandingBookingChecklist() {
  return (
    <section aria-labelledby="booking-checklist-heading" className="flex flex-col rounded-lg border border-grey-200 bg-white">
      <div className="flex flex-col gap-1 border-b border-grey-200 px-5 py-5 sm:px-6">
        <h2 id="booking-checklist-heading" className="text-h2 text-grey-900">
          Before you book a pickup
        </h2>
        <p className="text-body-sm text-grey-600">Have these details ready when you create a delivery.</p>
      </div>

      <ul className="flex flex-col divide-y divide-grey-100 px-5 sm:px-6">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-4 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-grey-200 bg-grey-50 text-grey-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="flex flex-wrap items-center gap-2 text-label text-grey-900">
                  {item.title}
                  {item.optional ? <span className="text-caption font-normal text-grey-500">Optional</span> : null}
                </h3>
                <p className="text-body-sm text-grey-600">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 border-t border-grey-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button asChild variant="secondary" size="lg">
          <Link href="/register">Create account</Link>
        </Button>
        <p className="text-body-sm text-grey-600">
          Shipping for a business? <TextLink href="/register?type=business">Register a business</TextLink>
        </p>
      </div>
    </section>
  );
}
