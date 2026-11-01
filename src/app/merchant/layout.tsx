import { AppShell } from "@/components/layout/app-shell";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return <AppShell area="MERCHANT">{children}</AppShell>;
}
