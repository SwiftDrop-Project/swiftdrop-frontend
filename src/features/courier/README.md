# Courier

The courier's own screens: today's pickups and deliveries, one parcel with its history, status updates
(picked up, in transit, out for delivery, delivered with the recipient's name, failed with a reason) and the
history of finished parcels. A courier only sees parcels assigned to them.

| | |
|---|---|
| Backend module | `com.swiftdrop.courier` (`../swiftdrop-backend/src/main/java/com/swiftdrop/courier`) |
| API | `../swiftdrop-backend/API.md`, section "Courier" |
| Owner | Kalpani (WP9) |
| Import as | `@/features/courier` (only what `index.ts` exports) |

## Built so far

- `api.ts`: `courierApi` (today, history, get, changeStatus)
- `types.ts`, `schemas.ts` (same rules and messages as API.md), `lib/labels.ts`, `lib/errors.ts`
- `hooks/use-courier-delivery.ts`: loads one parcel

Proof-of-delivery photos come later (backend PR2b): `proof.hasPhoto` is not shown yet.

## Layout

```text
courier/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── lib/          Labels, routes and error handling for the courier screens
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas for this feature's forms
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
