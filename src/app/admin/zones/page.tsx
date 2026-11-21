import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ZonesPricing } from "@/features/pricing";

export const metadata: Metadata = { title: "Zones & Pricing" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Zones & Pricing"
        description="Branches, distances between them and the rate card every delivery fee comes from."
      />
      <ZonesPricing />
    </>
  );
}
