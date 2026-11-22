import { AppShell } from "@/components/layout/app-shell";
import { AssistantLauncher } from "@/features/assistant";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell area="ADMIN">
      {children}
      <AssistantLauncher admin />
    </AppShell>
  );
}
