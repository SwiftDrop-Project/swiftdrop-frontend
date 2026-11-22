# Dispatch

Assigning parcels to couriers by zone: the dispatcher's unassigned parcels and couriers screens, and the courier's deliveries for today.

| | |
|---|---|
| Backend module | `com.swiftdrop.dispatch` (`../swiftdrop-backend/src/main/java/com/swiftdrop/dispatch`) |
| Owner | D.M.A.I. Disanayaka (dispatcher role and live tracking) |
| Import as | `@/features/dispatch` (only what `index.ts` exports) |

## Built so far

Dispatcher screens (role `DISPATCHER`, also open to `ADMIN`), on `/api/v1/dispatch/**`:

| Route | Component | What it does |
|---|---|---|
| `/dispatcher` | `DispatcherOverviewCard` | Today's figures for a branch: parcels waiting, open tasks, issues |
| `/dispatcher/assign` | `DispatchQueue` | Unassigned parcels (pickups, or parcels at the branch); select some and create a courier task |
| `/dispatcher/parcels` | `TaskList` | Every courier task, filtered by branch, status, type, day or courier (`?courierId=`) |
| `/dispatcher/tasks/[id]` | `TaskDetail` | One task: its parcels and outcomes; add or take out parcels, change courier, cancel |
| `/dispatcher/couriers` | `CourierWorkloadView` | Active couriers at a branch and their open tasks, least busy first |
| `/dispatcher/issues` | `DeliveryIssues` | Parcels couriers couldn't collect, load or deliver |

The chosen branch is remembered in this browser (`swiftdrop.dispatch.branch`), because `/auth/me` has no branch.
The courier's own card, `CourierTodayCard` (`/courier`), is still an empty state. `/dispatcher/tracking` is next (live tracking).

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
