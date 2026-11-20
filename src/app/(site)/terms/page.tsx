import type { Metadata } from "next";
import { TermsView } from "@/features/info";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for using SwiftDrop accounts, booking deliveries, cash on delivery, and prohibited items.",
  openGraph: {
    title: "Terms of Service · SwiftDrop",
    description: "Terms of Service for using SwiftDrop accounts, booking deliveries, cash on delivery, and prohibited items.",
    siteName: "SwiftDrop",
    type: "website",
  },
};

export default function TermsPage() {
  return <TermsView />;
}

