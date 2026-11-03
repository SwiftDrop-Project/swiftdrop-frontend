import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Payments" };

export default function Page() {
  return <ComingSoon href="/customer/payments" />;
}
