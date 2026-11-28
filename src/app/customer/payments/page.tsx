import type { Metadata } from "next";
import { ListPage } from "@/components/layout/list-page";
import { CustomerPayments } from "@/features/payments";

export const metadata: Metadata = { title: "Payments" };

export default function Page() {
  return (
    <ListPage
      title="Payments"
      description="One payment record for every delivery, paid in cash to the courier or by mock card."
    >
      <CustomerPayments />
    </ListPage>
  );
}
