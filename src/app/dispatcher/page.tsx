import type { Metadata } from "next";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DispatcherOverviewCard } from "@/features/dispatch";
import { RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = { title: "Overview" };

export default function DispatcherOverviewPage() {
  return (
    <>
      <WelcomeHeading description="Assign parcels to couriers, monitor branch deliveries and resolve delivery issues." />
      <RequireCurrentUser
        fallback={
          <Card className="p-6 sm:p-10" aria-busy="true" aria-label="Loading dispatcher overview">
            <div className="flex flex-col items-center gap-3 py-6">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </Card>
        }
      >
        <DispatcherOverviewCard />
      </RequireCurrentUser>
    </>
  );
}
