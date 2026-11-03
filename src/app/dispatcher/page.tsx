import type { Metadata } from "next";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { DispatcherOverviewCard } from "@/features/dispatch";

export const metadata: Metadata = { title: "Overview" };

export default function DispatcherOverviewPage() {
  return (
    <>
      <WelcomeHeading description="Approve merchants, assign parcels to couriers and keep deliveries moving." />
      <DispatcherOverviewCard />
    </>
  );
}
