# Delivery

Parcels and deliveries: creating them, listing them, status changes, proof of delivery and receipts. Covers the customer's deliveries and the merchant's orders.

| | |
|---|---|
| Backend module | `com.swiftdrop.delivery` (`../swiftdrop-backend/src/main/java/com/swiftdrop/delivery`) |
| Owner | TBD |
| Import as | `@/features/delivery` (only what `index.ts` exports) |

## Built so far

- `CreateDelivery` (`/customer/deliveries/new`): details form → review → tracking number with a copy button and the fee. Calls `POST /deliveries`; the pickup name and phone start as the customer's own.
- Overview cards: `CustomerParcelsCard`, `CustomerSetupCard`, `CustomerHelpCard` (`/customer`) and `MerchantOrdersCard` (`/merchant`). They show empty states until the delivery API exists.

## Layout

```text
delivery/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas for this feature's forms
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
