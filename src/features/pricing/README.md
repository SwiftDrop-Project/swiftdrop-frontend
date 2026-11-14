# Pricing

Delivery rates by district, weight and service level; price quotes for new deliveries. Also the public rates page (`/rates`) and the admin's Zones & pricing screen.

| | |
|---|---|
| Backend module | `com.swiftdrop.pricing` (`../swiftdrop-backend/src/main/java/com/swiftdrop/pricing`) |
| Owner | TBD |
| Import as | `@/features/pricing` (only what `index.ts` exports) |

## Built so far

- `useFeeEstimate` (`hooks/use-fee-estimate.ts`): `POST /pricing/estimate` for one parcel (loading, error, retry; a request that is no longer wanted is cancelled). Used by the delivery feature's review step (`FeeEstimateCard`).
- `labels.ts`: words for vehicles (`VEHICLE_LABEL`) and fee lines (`FEE_COMPONENT_LABEL`).
- `types.ts` and `api.ts`: the estimate request and response.
- `ZonesPricing` (`/admin/zones`, WP4, ADMIN only, read only): price calculator (`POST /admin/pricing/estimate`), routes
  from a branch (`GET /admin/pricing/routes`), branches with their centres (`GET /admin/pricing/districts`), the active
  rate card with its vehicles (`GET /admin/pricing/rate-card`). Its "See older versions" button opens the older
  versions' table at the top of the page (`GET /admin/pricing/rate-cards`, loaded on that click; "View" opens one
  with the values that changed since marked, "Hide" closes the table). Its own files: `admin-api.ts`, `admin-types.ts`,
  `hooks/use-admin-pricing.ts`, `schemas.ts` (calculator form) and the components in `components/`.

## Layout

```text
pricing/
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
