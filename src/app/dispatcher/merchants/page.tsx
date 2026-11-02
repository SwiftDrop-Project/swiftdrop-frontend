import type { Metadata } from "next";
import { ListPage } from "@/components/layout/list-page";
import { MerchantApprovals } from "@/features/merchants";

export const metadata: Metadata = { title: "Merchants" };

export default function DispatcherMerchantsPage() {
  return (
    <ListPage title="Merchants" description="Approve new merchant accounts so they can log in and send orders.">
      <MerchantApprovals />
    </ListPage>
  );
}
