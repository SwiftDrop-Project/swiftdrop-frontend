import type { Metadata } from "next";
import { RequireCurrentUser } from "@/features/identity";
import { HelpCenterSkeleton, InAppHelpView } from "@/features/info";

export const metadata: Metadata = { title: "Help and support" };

export default function Page() {
  return (
    <RequireCurrentUser fallback={<HelpCenterSkeleton />}>
      <InAppHelpView />
    </RequireCurrentUser>
  );
}
