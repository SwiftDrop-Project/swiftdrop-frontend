import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Track Parcel" };

export default function Page() {
  return <ComingSoon href="/admin/customer/track" />;
}
