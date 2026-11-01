import type { Metadata } from "next";
import { ComingSoon } from "@/components/feedback/coming-soon";

export const metadata: Metadata = { title: "API keys" };

export default function Page() {
  return <ComingSoon href="/merchant/api-keys" />;
}
