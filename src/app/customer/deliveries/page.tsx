import type { Metadata } from "next";
import { ComingSoon } from "@/components/feedback/coming-soon";

export const metadata: Metadata = { title: "My deliveries" };

export default function Page() {
  return <ComingSoon href="/customer/deliveries" />;
}
