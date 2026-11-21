"use client";

import { MerchantOrdersList } from "@/features/merchants";
import { ParcelDetailView } from "@/features/reporting";
import { ParcelWebhookMessages } from "./parcel-webhook-messages";

/*
 * Other features' parcel pages with this feature's webhook messages added through their slots. The wiring lives
 * here (webhooks -> merchants, webhooks -> reporting), so neither of those features imports webhooks: no cycle.
 * Client components, because the slots are functions and a server page can't pass a function to a client component.
 */

/** /merchant/orders: clicking an order shows its details and the webhook messages sent about it. */
export function OrdersWithWebhookMessages() {
  return (
    <MerchantOrdersList
      renderOrderDetails={(order) => <ParcelWebhookMessages scope="merchant" parcelId={order.id} />}
    />
  );
}

/**
 * /admin/parcels/[id]: the parcel, plus a "Webhook messages" card when a merchant booked it (customer bookings never
 * send webhooks).
 */
export function AdminParcelWithWebhookMessages() {
  return (
    <ParcelDetailView
      renderExtra={(parcel) =>
        parcel.sender.type === "MERCHANT" ? (
          <ParcelWebhookMessages scope="admin" parcelId={parcel.id} merchantId={parcel.sender.accountId} />
        ) : null
      }
    />
  );
}
