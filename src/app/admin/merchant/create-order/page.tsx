import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Create Order" };

export default function Page() {
  return <ComingSoon href="/admin/merchant/create-order" />;
}
