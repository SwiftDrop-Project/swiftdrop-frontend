import type { Metadata } from "next";
import { ParcelDirectory } from "@/features/reporting";

export const metadata: Metadata = { title: "All Parcels" };

export default function AdminParcelsPage() {
  return <ParcelDirectory />;
}
