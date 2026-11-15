import type { Metadata } from "next";
import { PrivacyView } from "@/features/info";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SwiftDrop collects, uses, protects, and handles your personal data under Sri Lankan law.",
  openGraph: {
    title: "Privacy Policy · SwiftDrop",
    description: "How SwiftDrop collects, uses, protects, and handles your personal data under Sri Lankan law.",
    siteName: "SwiftDrop",
    type: "website",
  },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}

