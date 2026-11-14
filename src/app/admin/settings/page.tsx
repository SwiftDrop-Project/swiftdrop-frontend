
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyDetailsCard } from "@/features/admin-settings/components/company-details-card";
import { DeliveryOperationsCard } from "@/features/admin-settings/components/delivery-operations-card";
import { NotificationSettingsCard } from "@/features/admin-settings/components/notification-settings-card";
import { SystemInformationCard } from "@/features/admin-settings/components/system-information-card";

export const metadata: Metadata = {
  title: "System Settings",
};

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Manage company information, delivery operations, and notification preferences."
      />

      <div className="flex flex-col gap-6">
        <CompanyDetailsCard />
        <DeliveryOperationsCard />
        <NotificationSettingsCard />
        <SystemInformationCard />
      </div>
    </div>
  );
}
