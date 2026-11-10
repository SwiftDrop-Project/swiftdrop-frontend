import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Track Shipments" };

export default function Page() {
  return <ComingSoon href="/admin/merchant/track" />;
}
