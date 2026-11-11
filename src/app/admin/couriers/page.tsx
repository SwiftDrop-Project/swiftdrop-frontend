import type { Metadata } from "next";
import { CourierManagement } from "@/features/identity";

export const metadata: Metadata = { title: "Courier Management" };

export default function AdminCouriersPage() {
  return <CourierManagement />;
}

