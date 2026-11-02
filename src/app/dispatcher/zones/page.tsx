import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Zones & pricing" };

export default function Page() {
  return <ComingSoon href="/dispatcher/zones" />;
}
