import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Update Status" };

export default function Page() {
  return <ComingSoon href="/admin/courier/update-status" />;
}
