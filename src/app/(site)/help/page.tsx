import type { Metadata } from "next";
import { HelpPageView } from "@/features/info";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers on tracking parcels, delivery fees, doorstep pickups, cash on delivery, and SwiftDrop accounts.",
  openGraph: {
    title: "Help centre · SwiftDrop",
    description: "Answers on tracking parcels, delivery fees, doorstep pickups, cash on delivery, and SwiftDrop accounts.",
    siteName: "SwiftDrop",
    type: "website",
  },
};

export default function HelpPage() {
  return <HelpPageView />;
}

