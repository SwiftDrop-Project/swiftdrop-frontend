import type { Metadata } from "next";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MerchantOrdersCard } from "@/features/delivery";
import { RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = { title: "Overview" };

export default function MerchantOverviewPage() {
  return (
    <>
      <WelcomeHeading description="Create orders, follow them to your customers and collect cash on delivery." />
      <RequireCurrentUser
        fallback={
          <Card className="p-6 sm:p-10" aria-busy="true" aria-label="Loading merchant orders">
            <div className="flex flex-col items-center gap-3 py-6">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </Card>
        }
      >
        <MerchantOrdersCard />
      </RequireCurrentUser>
    </>
  );
}
