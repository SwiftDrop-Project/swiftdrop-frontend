import type { Metadata } from "next";
import { PublicTrackingSearch } from "@/features/tracking";

export const metadata: Metadata = { title: "Track a parcel" };

export default function TrackPage() {
  return <PublicTrackingSearch />;
}
