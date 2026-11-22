# Delivery

Parcels and deliveries: creating them, listing them, status changes, proof of delivery and receipts. Covers the customer's deliveries and the merchant's orders.

| | |
|---|---|
| Backend module | `com.swiftdrop.delivery` (`../swiftdrop-backend/src/main/java/com/swiftdrop/delivery`) |
| Owner | TBD |
| Import as | `@/features/delivery` (only what `index.ts` exports) |

## Built so far

- `CreateDelivery` (`/customer/deliveries/new`): details form → review → tracking number with a copy button and the fee. Calls `POST /deliveries`; the pickup name and phone start as the customer's own. The parcel needs its weight and packed size (length, width, height in whole cm) and may be marked "Keep upright". The review step shows `FeeEstimateCard` beside the details: pricing's estimate (`useFeeEstimate` from `@/features/pricing`, `POST /pricing/estimate`) with its lines, the route, and what the courier carries and collects. A parcel that needs a manual quote can't be created (the button is off; the API would answer `409 PARCEL_NEEDS_MANUAL_QUOTE`). The review step also asks how the fee will be paid (`PaymentMethodCard`: online payment, pay at pickup or pay at drop-off), and "Create delivery" needs a choice. UI only for now: `POST /deliveries` doesn't take a payment method yet, so the choice isn't sent (see the `TODO(payments)` in `create-delivery.tsx`).
- `MyDeliveries` (`/customer/deliveries`): the customer's deliveries, newest first, 20 a page, with a status filter (`GET /deliveries`): tracking number, route, booked date, status and fee. Cards on phones, a table from md up. Beside the list, `ReceiptPreview` shows the chosen delivery's receipt (`GET /deliveries/{id}/receipt`, via `useReceipt`; the first on the page until "Receipt" is pressed on another) with "Download PDF", a plain link to `GET /deliveries/{id}/receipt/pdf` (`deliveryApi.receiptPdfUrl`; the browser sends the login cookie and the API answers with an attachment). The payment badge is grey "Paid" / outline "Due" (DESIGN.md keeps green for Delivered), and none for online payments, which aren't recorded yet.
- `DeliveryDetail` (`/customer/deliveries/[id]`): one delivery with its history as a timeline (`GET /deliveries/{id}`), including the packed size, the weight it was charged for and the pickup and drop-off vehicle; someone else's delivery or a wrong link shows "not found".
- Overviews: `CustomerOverview` (`/customer`: active, delivered and total counts, the five newest deliveries, the last
  pickup address and the latest delivered parcel, all from `GET /deliveries` via `useCustomerOverview`; the empty state
  for a new customer) and `MerchantOrdersCard` (`/merchant`, still an empty state). The customer overview's side cards
  use delivery data until the addresses and receipts APIs exist; then switch them to the saved default pickup and the
  receipt download.
- `hooks/use-deliveries.ts`: `useDeliveries` and `useDelivery` load the API data (loading, error, retry; stale requests are cancelled).

## Layout

```text
delivery/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas for this feature's forms
├── labels.ts     Words shown for API values (failure reasons, parcel size)
├── routes.ts     Hrefs of this feature's pages
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
