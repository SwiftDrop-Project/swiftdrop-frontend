import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Webhook Logs" };

export default function Page() {
  return <ComingSoon href="/admin/merchant/webhook-logs" />;
}
