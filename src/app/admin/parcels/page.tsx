import type { Metadata } from "next";
import { AdminParcelTracking } from "@/features/tracking";

export const metadata: Metadata = { title: "All Parcels" };

export default function Page() {
  return <AdminParcelTracking />;
}
