import type { Metadata } from "next";
import { AdminOverview } from "@/features/identity";
import { AdminOverviewStats } from "@/features/reporting";

export const metadata: Metadata = { title: "Admin Overview" };

export default function AdminOverviewPage() {
  return (
    <AdminOverview>
      <AdminOverviewStats />
    </AdminOverview>
  );
}
