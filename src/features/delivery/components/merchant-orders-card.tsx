import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** The merchant's orders on the merchant overview. Until the list is built, the empty state. */
export function MerchantOrdersCard() {
  return (
    <Card className="p-6 sm:p-10">
      <EmptyState
        icon={ClipboardList}
        size="lg"
        title="No orders yet"
        description="Create an order and a rider will collect it from your pickup address. Every order you send will be listed here with its latest status."
        actions={
          <Button asChild>
            <Link href="/merchant/orders/new">
              <Plus aria-hidden="true" />
              Create order
            </Link>
          </Button>
        }
      />
    </Card>
  );
}
