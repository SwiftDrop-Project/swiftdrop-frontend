import { AppShell } from "@/components/layout/app-shell";

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return <AppShell area="DISPATCHER">{children}</AppShell>;
}
