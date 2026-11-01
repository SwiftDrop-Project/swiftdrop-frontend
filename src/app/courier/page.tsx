import type { Metadata } from "next";
import Link from "next/link";
import { Truck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Card } from "@/components/layout/page-header";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Today's deliveries" };

export default function CourierTodayPage() {
  return (
    <>
      <WelcomeHeading description="Your pickups and deliveries for today, in the order you should do them." />
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
    </>
  );
}
