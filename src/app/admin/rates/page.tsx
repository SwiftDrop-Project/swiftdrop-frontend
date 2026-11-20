import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { DeliveryRates } from "@/features/pricing";

export const metadata: Metadata = { title: "Delivery Rates" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Delivery Rates"
        description="What customers pay: the weight charge, pickup and delivery by vehicle, and fees for typical parcels."
      />
      <DeliveryRates />
    </>
  );
}
