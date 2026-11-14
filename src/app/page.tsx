import type { Metadata } from "next";
import { LandingView } from "@/features/landing";

export const metadata: Metadata = {
  title: "SwiftDrop · Courier & Parcel Delivery Across Sri Lanka",
  description: "Send and track parcels across all 25 districts in Sri Lanka with live tracking.",
};

// Logged-in users are sent to their role's home by src/proxy.ts before reaching this page.
export default function RootPage() {
  return <LandingView />;
}
