import type { Metadata } from "next";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CourierTodayParcels } from "@/features/courier";
import { RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = { title: "Today's parcels" };

export default function CourierTodayPage() {
  return (
    <>
      <WelcomeHeading description="Your parcels to pick up and deliver, and the ones you finished today." />
      <RequireCurrentUser
        fallback={
          <Card className="p-6 sm:p-10" aria-busy="true" aria-label="Loading your parcels">
            <div className="flex flex-col items-center gap-3 py-6">
              <Skeleton className="size-12 rounded-full" />
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </Card>
        }
      >
        <CourierTodayParcels />
      </RequireCurrentUser>
    </>
  );
}
