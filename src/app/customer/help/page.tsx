import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Help and support" };

export default function Page() {
  return <ComingSoon href="/customer/help" />;
}
