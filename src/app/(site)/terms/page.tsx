import type { Metadata } from "next";
import { TermsView } from "@/features/info";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for using SwiftDrop accounts, booking deliveries, cash on delivery, and prohibited items.",
};

export default function TermsPage() {
  return <TermsView />;
}

