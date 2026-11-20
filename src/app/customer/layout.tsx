import { AssistantLauncher } from "@/features/assistant";
import { AppShell } from "@/components/layout/app-shell";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell area="CUSTOMER">
      {children}
      <AssistantLauncher signedIn />
    </AppShell>
  );
}
