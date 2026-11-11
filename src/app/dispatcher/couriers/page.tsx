import type { Metadata } from "next";
import { CourierWorkloadView } from "@/features/dispatch";

export const metadata: Metadata = { title: "Couriers" };

export default function Page() {
  return <CourierWorkloadView />;
}
