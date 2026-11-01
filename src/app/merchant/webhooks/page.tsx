import type { Metadata } from "next";
import { ComingSoon } from "@/components/feedback/coming-soon";

export const metadata: Metadata = { title: "Webhooks" };

export default function Page() {
  return <ComingSoon href="/merchant/webhooks" />;
}
