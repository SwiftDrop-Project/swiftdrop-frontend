import Link from "next/link";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** The courier's pickups and deliveries for today. Until assignment is built, the empty state. */
export function CourierTodayCard() {
  return (
    <Card className="p-6 sm:p-10">
      <EmptyState
        icon={Truck}
        size="lg"
        title="No deliveries assigned for today"
        description="When the dispatcher assigns parcels to you, they will appear here with the pickup and delivery addresses."
        actions={
          <Button asChild>
            <Link href="/courier/history">View delivery history</Link>
          </Button>
        }
      />
    </Card>
  );
}
