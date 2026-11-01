import type { Metadata } from "next";
import { ComingSoon } from "@/components/feedback/coming-soon";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <ComingSoon href="/customer/settings" />;
}
