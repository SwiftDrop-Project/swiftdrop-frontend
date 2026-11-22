import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Courier Overview" };

export default function Page() {
  return <ComingSoon href="/admin/courier" />;
}
