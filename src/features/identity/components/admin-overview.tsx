import type * as React from "react";
import Link from "next/link";
import { ArrowRight, Bike, Headset, Store, type LucideIcon } from "lucide-react";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireCurrentUser } from "./require-current-user";

interface WorkspaceCard {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
}

const WORKSPACES: WorkspaceCard[] = [
  {
    title: "Courier Management",
    description:
      "Create courier accounts, update contact and login details, assign branches and vehicles, block or remove accounts, and reset passwords.",
    href: "/admin/couriers",
    cta: "Manage couriers",
    icon: Bike,
  },
  {
    title: "Dispatcher Management",
    description:
      "Provision branch dispatcher accounts with mandatory first-login password change and inspect dispatcher profiles.",
    href: "/admin/dispatchers",
    cta: "Manage dispatchers",
    icon: Headset,
  },
  {
    title: "Merchant Approvals",
    description:
      "Review pending merchant store applications and approve or reject accounts waiting to send orders.",
    href: "/admin/merchants",
    cta: "Review merchants",
    icon: Store,
  },
];

function AdminOverviewSkeleton() {
  return (
    <section aria-label="Loading administration workspaces" className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <Card key={index} className="flex flex-col justify-between gap-6 p-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="size-10 rounded-md" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </Card>
      ))}
    </section>
  );
}

/** The admin home page: welcome heading, then `children` (e.g. the reporting figures), then the workspace cards. */
export function AdminOverview({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <WelcomeHeading description="Manage couriers, dispatchers, merchant approvals and platform operations from one place." />

      {children ? <div className="mb-10">{children}</div> : null}

      {children ? (
        <h2 id="admin-workspaces-heading" className="mb-4 text-h3 text-grey-900">
          Workspaces
        </h2>
      ) : null}

      <RequireCurrentUser fallback={<AdminOverviewSkeleton />}>
        <section
          aria-label={children ? undefined : "Administration workspaces"}
          aria-labelledby={children ? "admin-workspaces-heading" : undefined}
          className="grid gap-4 md:grid-cols-3"
        >
          {WORKSPACES.map(({ title, description, href, cta, icon: Icon }) => (
            <Card key={href} className="flex flex-col justify-between gap-6 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex size-10 items-center justify-center rounded-md border border-grey-200 bg-grey-50 text-grey-700">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-h3 text-grey-900">{title}</h2>
                  <p className="mt-2 text-body-sm text-grey-600">{description}</p>
                </div>
              </div>

              <div>
                <Button asChild variant="secondary">
                  <Link href={href}>
                    {cta}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </section>
      </RequireCurrentUser>
    </>
  );
}

