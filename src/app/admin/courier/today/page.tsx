import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Today's Deliveries" };

export default function Page() {
  return <ComingSoon href="/admin/courier/today" />;
}
