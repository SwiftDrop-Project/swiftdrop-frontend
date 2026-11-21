import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireCurrentUser } from "@/features/identity";
import { AdminWebhookLogs } from "@/features/webhooks";

export const metadata: Metadata = { title: "Webhook Logs" };

export default function AdminWebhookLogsPage() {
  return (
    <RequireCurrentUser
      fallback={
        <Card className="p-6" aria-busy="true" aria-label="Loading webhook logs">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      }
    >
      <AdminWebhookLogs />
    </RequireCurrentUser>
  );
}
