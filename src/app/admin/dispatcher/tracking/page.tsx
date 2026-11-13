import type { Metadata } from "next";
import { AdminParcelTracking } from "@/features/tracking";

export const metadata: Metadata = { title: "Parcel tracking" };

export default function Page() {
  return <AdminParcelTracking />;
}
