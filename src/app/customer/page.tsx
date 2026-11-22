import type { Metadata } from "next";
import { PageColumns } from "@/components/layout/page-columns";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerHelpCard, CustomerParcelsCard, CustomerSetupCard } from "@/features/delivery";
import { RequireCurrentUser } from "@/features/identity";
import { TrackParcelCard } from "@/features/tracking";

export const metadata: Metadata = { title: "Overview" };

function CustomerOverviewSkeleton() {
  return (
    <PageColumns
      aside={
        <>
          <Card className="p-6">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-4 h-10 w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-4 h-20 w-full" />
          </Card>
        </>
      }
    >
      <Card className="p-6 sm:p-10" aria-busy="true" aria-label="Loading customer overview">
        <div className="flex flex-col items-center gap-3 py-6">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </Card>
      <Card className="p-6">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="mt-4 h-32 w-full" />
      </Card>
    </PageColumns>
  );
}

/** docs/design/03 Dashboard shell.png */
export default function CustomerOverviewPage() {
  return (
    <>
      <WelcomeHeading description="Send a parcel to any district, or follow one that is on its way to you." />
      <RequireCurrentUser fallback={<CustomerOverviewSkeleton />}>
        <PageColumns
          aside={
            <>
              <TrackParcelCard />
              <CustomerHelpCard />
            </>
          }
        >
          <CustomerParcelsCard />
          <CustomerSetupCard />
        </PageColumns>
      </RequireCurrentUser>
    </>
  );
}
