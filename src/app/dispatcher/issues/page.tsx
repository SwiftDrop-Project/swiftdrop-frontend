import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryIssues } from "@/features/dispatch";
import { RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = { title: "Delivery issues" };

export default function Page() {
  return (
    <RequireCurrentUser
      fallback={
        <Card className="p-6" aria-busy="true" aria-label="Loading delivery issues">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      }
    >
      <DeliveryIssues />
    </RequireCurrentUser>
  );
}
