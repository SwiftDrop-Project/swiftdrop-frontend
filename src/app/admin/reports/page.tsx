import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsAnalytics } from "@/features/reporting";

export const metadata: Metadata = { title: "Reports & Analytics" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Delivery volume and outcomes for any period, compared with the period before it."
      />
      <ReportsAnalytics />
    </>
  );
}
