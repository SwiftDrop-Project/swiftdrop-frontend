import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "All parcels" };

export default function Page() {
  return <ComingSoon href="/dispatcher/parcels" />;
}
