import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDispatchTabs } from "@/features/dispatch";
import { DispatcherManagement, RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = { title: "Dispatcher Management" };

export default function AdminDispatchersPage() {
  return (
    <RequireCurrentUser
      fallback={
        <Card className="p-6" aria-busy="true" aria-label="Loading dispatcher management">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      }
    >
      <AdminDispatchTabs accounts={<DispatcherManagement />} />
    </RequireCurrentUser>
  );
}
