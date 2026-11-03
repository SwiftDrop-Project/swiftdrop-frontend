import { AppShell } from "@/components/layout/app-shell";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell area="CUSTOMER">{children}</AppShell>;
}
