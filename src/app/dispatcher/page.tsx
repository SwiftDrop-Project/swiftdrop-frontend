import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Card } from "@/components/layout/page-header";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Overview" };

export default function DispatcherOverviewPage() {
  return (
    <>
      <WelcomeHeading description="Approve merchants, assign parcels to couriers and keep deliveries moving." />
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
    </>
  );
}
