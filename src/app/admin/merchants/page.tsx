import type { Metadata } from "next";
import { ListPage } from "@/components/layout/list-page";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireCurrentUser } from "@/features/identity";
import { MerchantApprovals } from "@/features/merchants";

export const metadata: Metadata = { title: "Merchant Approvals" };

function MerchantApprovalsSkeleton() {
  return (
    <Card className="p-6" aria-busy="true" aria-label="Loading merchant approvals">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </Card>
  );
}

export default function AdminMerchantsPage() {
  return (
    <ListPage
      title="Merchant Approvals"
      description="Approve new merchant accounts so they can log in and send orders."
    >
      <RequireCurrentUser fallback={<MerchantApprovalsSkeleton />}>
        <MerchantApprovals />
      </RequireCurrentUser>
    </ListPage>
  );
}

