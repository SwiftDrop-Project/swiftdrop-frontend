import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Unassigned Parcels" };

export default function Page() {
  return <ComingSoon href="/admin/dispatcher/unassigned" />;
}
