import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CustomerOverview, CustomerOverviewSkeleton } from "@/features/delivery";
import { RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = { title: "Overview" };

/** Overview@1x.png */
export default function CustomerOverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Your deliveries, pickups and fees at a glance."
        action={
          <Button asChild>
            <Link href="/customer/deliveries/new">
              <Plus aria-hidden="true" />
              Create delivery
            </Link>
          </Button>
        }
      />
      <RequireCurrentUser fallback={<CustomerOverviewSkeleton />}>
        <CustomerOverview />
      </RequireCurrentUser>
    </>
  );
}
