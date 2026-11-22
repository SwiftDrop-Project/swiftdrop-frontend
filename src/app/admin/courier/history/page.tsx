import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Delivery History" };

export default function Page() {
  return <ComingSoon href="/admin/courier/history" />;
}
