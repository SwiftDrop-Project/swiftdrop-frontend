import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Delivery Details" };

export default function Page() {
  return <ComingSoon href="/admin/courier/delivery-details" />;
}
