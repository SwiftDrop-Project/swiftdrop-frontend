import type { Metadata } from "next";
import { PrivacyView } from "@/features/info";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SwiftDrop collects, uses, protects, and handles your personal data under Sri Lankan law.",
};

export default function PrivacyPage() {
  return <PrivacyView />;
}

