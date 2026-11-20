import type { Metadata } from "next";
import { MerchantOrdersList } from "@/features/merchants";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <MerchantOrdersList />;
}
