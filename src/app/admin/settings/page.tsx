import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import {
  CompanyDetailsCard,
  DeliveryOperationsCard,
  NotificationSettingsCard,
  SystemInformationCard,
} from "@/features/admin-settings";
import { RequireCurrentUser } from "@/features/identity";

export const metadata: Metadata = {
  title: "System Settings",
};

export default function AdminSettingsPage() {
  return (
    <RequireCurrentUser fallback={null}>
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
    </RequireCurrentUser>
  );
}
