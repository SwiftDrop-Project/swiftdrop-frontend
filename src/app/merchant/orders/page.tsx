import type { Metadata } from "next";
import { OrdersWithWebhookMessages } from "@/features/webhooks";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrdersWithWebhookMessages />;
}
