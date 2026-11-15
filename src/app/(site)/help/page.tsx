import type { Metadata } from "next";
import { HelpPageView } from "@/features/info";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers on tracking parcels, delivery fees, doorstep pickups, cash on delivery, and SwiftDrop accounts.",
};

export default function HelpPage() {
  return <HelpPageView />;
}

