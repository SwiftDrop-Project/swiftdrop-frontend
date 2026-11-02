import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** What needs the dispatcher's attention today. Until figures exist, the empty state. */
export function DispatcherOverviewCard() {
  return (
    <Card className="p-6 sm:p-10">
      <EmptyState
        icon={Store}
        size="lg"
        title="Nothing needs your attention yet"
        description="Parcel and courier figures will appear here once deliveries start. New merchant applications are listed under Merchants."
        actions={
          <Button asChild>
            <Link href="/dispatcher/merchants">Review merchants</Link>
          </Button>
        }
      />
    </Card>
  );
}
