import type { Metadata } from "next";
import { DeliveryIssues } from "@/features/dispatch";

export const metadata: Metadata = { title: "Delivery issues" };

export default function Page() {
  return <DeliveryIssues />;
}
