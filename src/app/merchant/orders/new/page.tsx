import type { Metadata } from "next";
import { ComingSoon } from "@/components/feedback/coming-soon";

export const metadata: Metadata = { title: "Create order" };

export default function Page() {
  return <ComingSoon href="/merchant/orders/new" />;
}
