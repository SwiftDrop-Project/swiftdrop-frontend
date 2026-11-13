import type { Metadata } from "next";
import { CourierDetailView } from "@/features/identity";

export const metadata: Metadata = { title: "Courier Details" };

export default function AdminCourierDetailPage() {
  return <CourierDetailView />;
}

