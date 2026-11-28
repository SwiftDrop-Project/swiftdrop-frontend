import type { Metadata } from "next";
import { ListPage } from "@/components/layout/list-page";
import { CustomerAddresses } from "@/features/customer";

export const metadata: Metadata = { title: "Addresses" };

export default function Page() {
  return (
    <ListPage
      title="Addresses"
      description="Save pickup and drop-off addresses once and reuse them when you create a delivery."
    >
      <CustomerAddresses />
    </ListPage>
  );
}
