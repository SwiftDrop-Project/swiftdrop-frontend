import type { Metadata } from "next";
import Link from "next/link";
import { Check, Package, Plus } from "lucide-react";
import { TrackParcelCard } from "@/components/customer/track-parcel-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Card } from "@/components/layout/page-header";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";

export const metadata: Metadata = { title: "Overview" };

const SETUP_STEPS = [
  {
    title: "Create your account",
    description: "Your account is ready to use.",
    done: true,
  },
  {
    title: "Add a pickup address",
    description: "Riders collect from this address unless you choose another.",
    action: { label: "Add address", href: "/customer/addresses" },
  },
  {
    title: "Create your first delivery",
    description: "Enter the recipient, parcel weight and delivery address.",
    action: { label: "Create delivery", href: "/customer/deliveries/new" },
  },
];

const HELP_LINKS = [
  { label: "How pickups work", href: "/customer/help" },
  { label: "Delivery rates by district", href: "/customer/help" },
  { label: "Contact support", href: "/customer/help" },
];

/** docs/design/03 Dashboard shell.png */
export default function CustomerOverviewPage() {
  const doneCount = SETUP_STEPS.filter((step) => step.done).length;

  return (
    <>
      <WelcomeHeading description="Send a parcel to any district, or follow one that is on its way to you." />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18.75rem]">
        <div className="flex flex-col gap-6">
          <Card className="p-6 sm:p-10" aria-label="Your parcels">
            <EmptyState
              icon={Package}
              size="lg"
              title="You haven’t sent any parcels yet"
              description="Create a delivery and a rider will collect it from your address. Every parcel you send will be listed here with its latest status."
              actions={
                <>
                  <Button asChild>
                    <Link href="/customer/deliveries/new">
                      <Plus aria-hidden="true" />
                      Create delivery
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/customer/addresses">Add a pickup address</Link>
                  </Button>
                </>
              }
            />
          </Card>

          <Card aria-labelledby="setup-heading">
            <div className="flex items-center justify-between gap-4 border-b border-grey-200 px-6 py-5">
              <h2 id="setup-heading" className="text-h3 text-grey-900">
                Get set up
              </h2>
              <p className="text-label text-grey-600">
                {doneCount} of {SETUP_STEPS.length} done
              </p>
            </div>
            <ol>
              {SETUP_STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-4 border-b border-grey-100 px-6 py-5 last:border-b-0"
                >
                  {step.done ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                      <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-grey-300 text-caption text-grey-700 tabular-nums">
                      {index + 1}
                    </span>
                  )}
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div>
                      <p className={step.done ? "text-label text-grey-600" : "text-label text-grey-900"}>
                        {step.title}
                        {step.done ? <span className="sr-only"> (done)</span> : null}
                      </p>
                      <p className="mt-1 text-body-sm text-grey-600">{step.description}</p>
                    </div>
                    {step.action ? (
                      <TextLink href={step.action.href} className="text-label whitespace-nowrap">
                        {step.action.label}
                      </TextLink>
                    ) : (
                      <span className="text-body-sm text-grey-600" aria-hidden="true">
                        Done
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <TrackParcelCard />

          <Card className="p-6" aria-labelledby="help-heading">
            <h2 id="help-heading" className="text-h3 text-grey-900">
              Need a hand?
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {HELP_LINKS.map((link) => (
                <li key={link.label}>
                  <TextLink href={link.href} className="font-medium">
                    {link.label}
                  </TextLink>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
