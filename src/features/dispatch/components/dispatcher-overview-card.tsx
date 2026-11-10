import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** What needs the dispatcher's attention today. Until figures exist, the empty state. */
export function DispatcherOverviewCard() {
  return (
    <Card className="p-6 sm:p-10">
      <EmptyState
        icon={PackageOpen}
        size="lg"
        title="No unassigned parcels waiting right now"
        description="Branch parcel queues and active courier capacity will appear here once deliveries arrive at your branch."
        actions={
          <Button asChild>
            <Link href="/dispatcher/assign">View unassigned parcels</Link>
          </Button>
        }
      />
    </Card>
  );
}
