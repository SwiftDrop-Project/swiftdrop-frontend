# Dispatch

Assigning parcels to couriers by zone: the dispatcher's unassigned parcels and couriers screens, and the courier's deliveries for today.

| | |
|---|---|
| Backend module | `com.swiftdrop.dispatch` (`../swiftdrop-backend/src/main/java/com/swiftdrop/dispatch`) |
| Owner | TBD |
| Import as | `@/features/dispatch` (only what `index.ts` exports) |

## Built so far

- Overview cards: `CourierTodayCard` (`/courier`) and `DispatcherOverviewCard` (`/dispatcher`), empty states for now.

## Layout

```text
dispatch/
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
