import type { Metadata } from "next";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CourierTodayCard } from "@/features/dispatch";
import { RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = { title: "Today's deliveries" };

export default function CourierTodayPage() {
  return (
    <>
      <WelcomeHeading description="Your pickups and deliveries for today, in the order you should do them." />
      <RequireCurrentUser
        fallback={
          <Card className="p-6 sm:p-10" aria-busy="true" aria-label="Loading courier deliveries">
            <div className="flex flex-col items-center gap-3 py-6">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </Card>
        }
      >
        <CourierTodayCard />
      </RequireCurrentUser>
    </>
  );
}
