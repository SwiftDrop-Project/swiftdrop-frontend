import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerProfileView } from "@/features/customer";

export const metadata: Metadata = { title: "Profile" };

/** docs/design/Profile.png */
export default function CustomerProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account details and delivery preferences."
      />
      <CustomerProfileView />
    </>
  );
}
