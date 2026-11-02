import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Create delivery" };

export default function Page() {
  return <ComingSoon href="/customer/deliveries/new" />;
}
