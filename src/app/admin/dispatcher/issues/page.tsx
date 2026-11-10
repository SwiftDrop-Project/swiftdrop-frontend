import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Delivery Issues" };

export default function Page() {
  return <ComingSoon href="/admin/dispatcher/issues" />;
}
