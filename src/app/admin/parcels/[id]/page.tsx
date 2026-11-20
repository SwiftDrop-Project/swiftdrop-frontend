import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireCurrentUser } from "@/features/identity";
import { ParcelDetailView } from "@/features/reporting";

export const metadata: Metadata = { title: "Parcel Details" };

export default function AdminParcelDetailPage() {
  return (
    <RequireCurrentUser
      fallback={
        <Card className="p-6" aria-busy="true" aria-label="Loading parcel">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      }
    >
      <ParcelDetailView />
    </RequireCurrentUser>
  );
}
