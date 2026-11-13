import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "System Settings" };

export default function Page() {
  return <ComingSoon href="/admin/settings" />;
}
