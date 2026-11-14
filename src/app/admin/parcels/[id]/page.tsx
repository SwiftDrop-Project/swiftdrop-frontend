import type { Metadata } from "next";
import { ParcelDetailView } from "@/features/reporting";

export const metadata: Metadata = { title: "Parcel Details" };

export default function AdminParcelDetailPage() {
  return <ParcelDetailView />;
}
