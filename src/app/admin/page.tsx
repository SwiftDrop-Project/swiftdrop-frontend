import type { Metadata } from "next";
import { AdminOverview } from "@/features/identity";

export const metadata: Metadata = { title: "Admin Overview" };

export default function AdminOverviewPage() {
  return <AdminOverview />;
}

