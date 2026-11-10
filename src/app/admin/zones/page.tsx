import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Zones & Pricing" };

export default function Page() {
  return <ComingSoon href="/admin/zones" />;
}
