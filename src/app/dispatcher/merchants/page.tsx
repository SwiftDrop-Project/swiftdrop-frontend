import type { Metadata } from "next";
import { MerchantApprovals } from "@/components/admin/merchant-approvals";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Merchants" };

export default function DispatcherMerchantsPage() {
  return (
    <>
      <PageHeader
        title="Merchants"
        description="Approve new merchant accounts so they can log in and send orders."
      />
      <MerchantApprovals />
    </>
  );
}
