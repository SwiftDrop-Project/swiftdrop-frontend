import type { Metadata } from "next";
import { CreateOrderForm } from "@/features/merchants";

export const metadata: Metadata = { title: "Create order" };

export default function Page() {
  return <CreateOrderForm />;
}
