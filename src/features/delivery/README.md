# Delivery

Parcels and deliveries: creating them, listing them, status changes, proof of delivery and receipts. Covers the customer's deliveries and the merchant's orders.

| | |
|---|---|
| Backend module | `com.swiftdrop.delivery` (`../swiftdrop-backend/src/main/java/com/swiftdrop/delivery`) |
| Owner | TBD |
| Import as | `@/features/delivery` (only what `index.ts` exports) |

## Built so far

- `CreateDelivery` (`/customer/deliveries/new`): details form → review → tracking number with a copy button and the fee. Calls `POST /deliveries`; the pickup name and phone start as the customer's own. The review step shows `FeeEstimateCard` (estimated fee, route, weight, cash to collect) beside the details. TEMPORARY: the estimate is the flat Rs. 450.00 in `fee-estimate.ts` until a fee estimate endpoint exists.
- `MyDeliveries` (`/customer/deliveries`): the customer's deliveries, newest first, 20 a page, with a status filter (`GET /deliveries`). Cards on phones, a table from md up.
- `DeliveryDetail` (`/customer/deliveries/[id]`): one delivery with its history as a timeline (`GET /deliveries/{id}`); someone else's delivery or a wrong link shows "not found".
- Overview cards: `CustomerParcelsCard` (the five newest deliveries, or the empty state for a new customer), `CustomerSetupCard`, `CustomerHelpCard` (`/customer`) and `MerchantOrdersCard` (`/merchant`, still an empty state).
- `hooks/use-deliveries.ts`: `useDeliveries` and `useDelivery` load the API data (loading, error, retry; stale requests are cancelled).

## Layout

```text
delivery/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas for this feature's forms
├── fee-estimate.ts  The fee shown before booking (flat for now)
├── labels.ts     Words shown for API codes (failure reasons)
├── routes.ts     Hrefs of this feature's pages
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
