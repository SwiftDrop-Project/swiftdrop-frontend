import type { Metadata } from "next";
import { FormPage } from "@/components/layout/form-page";
import { AccountSettings } from "@/features/identity";

export const metadata: Metadata = { title: "Account settings" };

export default function AdminAccountSettingsPage() {
  return (
    <FormPage title="Account settings" description="Your account and sign-in details.">
      <AccountSettings />
    </FormPage>
  );
}

