import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Card } from "@/components/layout/page-header";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Overview" };

export default function MerchantOverviewPage() {
  return (
    <>
      <WelcomeHeading description="Create orders, follow them to your customers and collect cash on delivery." />
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
    </>
  );
}
