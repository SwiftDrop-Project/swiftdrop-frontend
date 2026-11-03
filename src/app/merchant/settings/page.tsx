import type { Metadata } from "next";
import { FormPage } from "@/components/layout/form-page";
import { AccountSettings } from "@/features/identity";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <FormPage title="Settings" description="Your account and sign-in details.">
      <AccountSettings />
    </FormPage>
  );
}
