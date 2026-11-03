import type { Metadata } from "next";
import { WelcomeHeading } from "@/components/layout/welcome-heading";
import { MerchantOrdersCard } from "@/features/delivery";

export const metadata: Metadata = { title: "Overview" };

export default function MerchantOverviewPage() {
  return (
    <>
      <WelcomeHeading description="Create orders, follow them to your customers and collect cash on delivery." />
      <MerchantOrdersCard />
    </>
  );
}
