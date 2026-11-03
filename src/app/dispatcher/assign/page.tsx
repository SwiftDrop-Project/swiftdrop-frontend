import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Unassigned parcels" };

export default function Page() {
  return <ComingSoon href="/dispatcher/assign" />;
}
