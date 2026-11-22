import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminParcelTracking } from "@/features/tracking";
import { RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = { title: "Parcel tracking" };

export default function Page() {
  return (
    <RequireCurrentUser
      fallback={
        <Card className="p-6" aria-busy="true" aria-label="Loading parcels">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      }
    >
      <AdminParcelTracking />
    </RequireCurrentUser>
  );
}
