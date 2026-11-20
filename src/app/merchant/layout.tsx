import { AssistantLauncher } from "@/features/assistant";
import { AppShell } from "@/components/layout/app-shell";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell area="MERCHANT">
      {children}
      <AssistantLauncher signedIn />
    </AppShell>
  );
}
