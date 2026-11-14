# Reporting

Figures and reports for the admin portal: the admin overview (`/admin`) and, later, Reports & Analytics
(`/admin/reports`).

| | |
|---|---|
| Backend module | `com.swiftdrop.reporting` (`../swiftdrop-backend/src/main/java/com/swiftdrop/reporting`) |
| Owner | WP4 |
| Import as | `@/features/reporting` (only what `index.ts` exports) |

## Built so far

- `AdminOverviewStats` (`GET /admin/reports/overview`): deliveries today (booked, delivered, failed, 7-day success
  rate), the last 7 days per day, accounts per role with merchants waiting for approval, and the newest accounts.
  Shown on `/admin` inside identity's `AdminOverview`, above the workspace cards.
- `ParcelDirectory` (`/admin/parcels`, `GET /admin/parcels` and `/stats`): summary cards, search, filters (status,
  payment, pickup and delivery district, booking dates, sort), the parcel table and the CSV export link.
- `ParcelDetailView` (`/admin/parcels/[id]`, `GET /admin/parcels/{id}`): sender and receiver, parcel details, proof of
  delivery, the account that booked it and the tracking history. Read only: admins don't assign couriers.

## Layout

```text
reporting/
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
