import { AppShell } from "@/components/layout/app-shell";

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return <AppShell area="COURIER">{children}</AppShell>;
}
