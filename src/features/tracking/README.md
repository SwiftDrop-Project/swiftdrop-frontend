# Tracking

Parcel tracking by tracking number, for customers and the public (`/track`), with live updates over WebSocket (STOMP), the dispatchers' live board and the admin's list of every parcel.

| | |
|---|---|
| Backend module | `com.swiftdrop.tracking` (`../swiftdrop-backend/src/main/java/com/swiftdrop/tracking`) |
| Owner | D.M.A.I. Disanayaka (WP8, live tracking) |
| Import as | `@/features/tracking` (only what `index.ts` exports) |

## Built so far

| Route | Component | What it does |
|---|---|---|
| `/track` | `PublicTrackingSearch` | Tracking-number form, no login |
| `/track/[trackingNumber]` | `PublicTrackingResult` | One parcel, updated live |
| `/customer/track?number=` | `CustomerTracking` | The same inside the app (the overview's `TrackParcelCard` links here), plus "Your parcels": the customer's newest parcels from `GET /tracking/mine`, updated live on their private queue `/user/queue/parcels` (logged-in WebSocket) |
| `/dispatcher/tracking` | `LiveBoard` | Every status change as it happens, per branch; follow any parcel beside it |
| `/admin/parcels` (menu "All Parcels"), also `/admin/dispatcher/tracking` | `AdminParcelTracking` | Every parcel's latest status with filters (tracking number, status with counts, district, last updated between two days) and paging; rows change live, select one to see its journey |

- `TrackingResult`: status, towns and journey (`Timeline`) for one parcel. `useParcelTracking` loads
  `GET /track/{number}`, then follows `/topic/parcels/{number}`; it reloads after every reconnect and polls every
  30 s while the WebSocket is down.
- `live.ts`: the STOMP client (`@stomp/stompjs`, plain WebSocket). Public pages use `/api/v1/ws/public`; the live board
  uses `/api/v1/ws`, where the backend checks the `SD_TOKEN` cookie.
- `useAdminParcels` loads `GET /admin/tracking/parcels` and `/counts` (ADMIN), patches rows on the page from
  `/topic/live` and counts changes to other parcels, so the page offers a refresh. The list is the backend tracking
  module's own index: a parcel appears after its first status change or lookup since the index was added.
- The shared `ParcelStatus` has no `AT_BRANCH` yet, so `TrackingStatus` adds it here.

## Layout

```text
tracking/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── live.ts       STOMP-over-WebSocket subscription helper
├── labels.ts     Status and failure-reason wording
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas for this feature's forms
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
