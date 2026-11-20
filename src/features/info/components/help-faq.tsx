import { ChevronDown } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ParcelStatus } from "@/types";
import { SUPPORT_EMAIL } from "../constants";
import { InfoArticleLayout, InfoSection, type TocSection } from "./info-article-layout";

export const HELP_SECTIONS: TocSection[] = [
  { id: "tracking", label: "Tracking" },
  { id: "booking-and-fees", label: "Booking and fees" },
  { id: "pickup-and-delivery", label: "Pickup and delivery" },
  { id: "cash-on-delivery", label: "Cash on delivery" },
  { id: "your-account", label: "Your account" },
  { id: "businesses", label: "Businesses" },
  { id: "contact", label: "Contact" },
];

const PARCEL_STATUS_DESCRIPTIONS: { status: ParcelStatus; description: string }[] = [
  {
    status: "CREATED",
    description: "Booked and waiting for a courier to collect the parcel from the sender.",
  },
  {
    status: "PICKED_UP",
    description: "Collected from the sender's doorstep by a SwiftDrop courier.",
  },
  {
    status: "AT_BRANCH",
    description: "At a SwiftDrop district branch for sorting or transfer.",
  },
  {
    status: "IN_TRANSIT",
    description: "Moving between district branches toward the destination branch.",
  },
  {
    status: "OUT_FOR_DELIVERY",
    description: "With a courier on the way to the recipient's address.",
  },
  {
    status: "DELIVERED",
    description: "Handed over to the recipient.",
  },
  {
    status: "FAILED",
    description: "The delivery attempt did not succeed; the parcel goes back to a branch for another try.",
  },
];

function FaqItem({
  question,
  defaultOpen = false,
  children,
}: {
  question: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-grey-200 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-4 py-3 text-label font-semibold text-grey-900 select-none hover:bg-grey-50 focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <ChevronDown
          className="size-5 shrink-0 text-grey-600 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="flex flex-col gap-3 border-t border-grey-200 px-4 py-4 text-body-sm text-grey-700">
        {children}
      </div>
    </details>
  );
}

export function HelpFaqContent() {
  return (
    <div className="flex flex-col gap-10">
      <InfoSection id="tracking" title="Tracking">
        <div className="flex flex-col gap-3">
          <FaqItem question="Where do I find my tracking number?" defaultOpen>
            <p>
              Find the tracking number in your booking confirmation email or on the parcel label. It starts with{" "}
              <span className="font-semibold text-grey-900 tabular-nums">SD</span> followed by 10 digits, for example{" "}
              <span className="font-semibold text-grey-900 tabular-nums">SD 2611 0048 17</span>.
            </p>
            <p>
              Anyone with the tracking number can check status updates on{" "}
              <Link
                href="/track"
                className="font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600 rounded-sm"
              >
                Track a parcel
              </Link>{" "}
              without logging in.
            </p>
          </FaqItem>

          <FaqItem question="What does each parcel status mean?" defaultOpen>
            <p>Each parcel moves through the following statuses as it travels from pickup to delivery:</p>
            <ul className="mt-1 flex flex-col gap-3">
              {PARCEL_STATUS_DESCRIPTIONS.map((item) => (
                <li key={item.status} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <StatusBadge status={item.status} className="w-fit shrink-0" />
                  <span>{item.description}</span>
                </li>
              ))}
            </ul>
          </FaqItem>

          <FaqItem question="Why does public tracking show no names or addresses?">
            <p>
              To protect sender and recipient privacy, the public tracking page only shows the parcel status, origin
              and destination districts, branch updates, and timestamps. Names, phone numbers, and street addresses are
              never shown publicly.
            </p>
          </FaqItem>
        </div>
      </InfoSection>

      <InfoSection id="booking-and-fees" title="Booking and fees">
        <div className="flex flex-col gap-3">
          <FaqItem question="How is the delivery fee worked out?">
            <p>Delivery fees are calculated from five factors:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Base handling fee for the parcel</li>
              <li>Parcel weight</li>
              <li>Vehicle type needed for the parcel</li>
              <li>Road distance between the pickup and delivery district branches</li>
              <li>Cash-on-delivery collection fee, if cash on delivery is selected</li>
            </ul>
          </FaqItem>

          <FaqItem question="Do I see the fee before I confirm my booking?">
            <p>
              Yes. The full fee breakdown is calculated and shown before you confirm your delivery booking, so there are
              no surprise charges.
            </p>
          </FaqItem>

          <FaqItem question="What is the maximum weight limit?">
            <p>
              Standard parcels up to <span className="font-semibold text-grey-900">50 kg</span> are priced
              automatically during booking. Very large or heavy parcels that exceed our standard vehicle limits require a
              manual quote before booking.
            </p>
          </FaqItem>
        </div>
      </InfoSection>

      <InfoSection id="pickup-and-delivery" title="Pickup and delivery">
        <div className="flex flex-col gap-3">
          <FaqItem question="How do pickup and delivery work?">
            <p>
              SwiftDrop provides doorstep pickup and doorstep delivery. After you book, a courier collects the parcel from
              your pickup address, takes it to your local branch, transfers it between district branches to the
              destination branch, and delivers it to the recipient&apos;s address.
            </p>
          </FaqItem>

          <FaqItem question="What happens after a failed delivery attempt?">
            <p>
              If a courier cannot complete delivery (for example, the recipient is unavailable or the address cannot be
              reached), the parcel status changes to failed and the parcel returns to the destination district branch so
              another delivery attempt can be arranged.
            </p>
          </FaqItem>
        </div>
      </InfoSection>

      <InfoSection id="cash-on-delivery" title="Cash on delivery">
        <div className="flex flex-col gap-3">
          <FaqItem question="How does cash on delivery work and what is the limit?">
            <p>
              When booking with cash on delivery, enter the amount to collect from the recipient. The courier collects
              that cash amount when handing over the parcel.
            </p>
            <p>
              The maximum cash-on-delivery amount per parcel is{" "}
              <span className="font-semibold text-grey-900 tabular-nums">LKR 500,000</span>.
            </p>
          </FaqItem>
        </div>
      </InfoSection>

      <InfoSection id="your-account" title="Your account">
        <div className="flex flex-col gap-3">
          <FaqItem question="How do I verify my email if I did not receive the code?">
            <p>
              After creating an account, SwiftDrop sends a 6-digit verification code to your email address. Check your
              spam or junk folder if you do not see it within a minute.
            </p>
            <p>
              If the code has not arrived, you can request a new verification code on the verification page after{" "}
              <span className="font-semibold text-grey-900">60 seconds</span>.
            </p>
          </FaqItem>

          <FaqItem question="What if I forget my password?">
            <p>
              Select{" "}
              <Link
                href="/forgot-password"
                className="font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600 rounded-sm"
              >
                Forgot password
              </Link>{" "}
              on the log in page and enter your email address or mobile number. We will email a 6-digit code so you can
              set a new password. Resetting your password logs out all existing sessions.
            </p>
          </FaqItem>

          <FaqItem question="Can I sign in with Google?">
            <p>
              Yes. You can continue with Google from the log in page. The first time you sign in with Google, you will be
              asked to finish setting up your profile details (such as your mobile number and account type) before
              booking parcels.
            </p>
          </FaqItem>
        </div>
      </InfoSection>

      <InfoSection id="businesses" title="Businesses">
        <div className="flex flex-col gap-3">
          <FaqItem question="How do business accounts, API keys, and webhooks work?">
            <p>
              Businesses sign up through{" "}
              <Link
                href="/register?type=business"
                className="font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600 rounded-sm"
              >
                Register a business
              </Link>
              . SwiftDrop reviews and approves business applications before unlocking business tools.
            </p>
            <p>
              Once approved, you can generate API keys in the merchant dashboard and register webhook URLs to receive
              automated parcel status updates directly in your own system.
            </p>
          </FaqItem>
        </div>
      </InfoSection>

      <InfoSection id="contact" title="Contact">
        <p className="text-body text-grey-700">
          Need further help with a parcel or account? Email our support team at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600 rounded-sm"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </InfoSection>
    </div>
  );
}

/** Public /help page. */
export function HelpPageView() {
  return (
    <InfoArticleLayout
      title="Help centre"
      description="Answers on tracking parcels, delivery fees, pickups, cash on delivery, and accounts."
      sections={HELP_SECTIONS}
    >
      <HelpFaqContent />
    </InfoArticleLayout>
  );
}

/** In-app help view shared across customer, merchant, courier, dispatcher, and admin roles. */
export function InAppHelpView() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Help and support"
        description="Answers on tracking parcels, delivery fees, pickups, cash on delivery, and accounts."
      />
      <HelpFaqContent />
    </div>
  );
}

/** Structural skeleton rendered while RequireCurrentUser resolves on in-app help pages. */
export function HelpCenterSkeleton() {
  return (
    <div role="status" aria-label="Loading help centre" className="max-w-3xl">
      <PageHeader
        title={<Skeleton className="h-8 w-56 max-w-full" />}
        description={
          <span aria-hidden="true" className="block h-5 w-80 max-w-full animate-pulse rounded-md bg-grey-100" />
        }
      />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

