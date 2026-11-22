import { AppShell } from "@/components/layout/app-shell";
import { CourierPreviewBanner } from "@/features/courier";

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell area="COURIER">
      <CourierPreviewBanner />
      {children}
    </AppShell>
  );
}
