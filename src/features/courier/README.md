# Courier

The courier's own screens. A dispatcher gives couriers **tasks** (pickup, transfer between branches, final delivery),
each holding one or more parcels. The courier records what happened to each parcel, hands parcels over at a branch,
completes the task, and looks at one parcel with its history. A courier only sees their own tasks and the parcels in
them.

| | |
|---|---|
| Backend module | `com.swiftdrop.courier` (`../swiftdrop-backend/src/main/java/com/swiftdrop/courier`) |
| API | `../swiftdrop-backend/API.md`, section "Courier" |
| Owner | Kalpani (WP9) |
| Import as | `@/features/courier` (only what `index.ts` exports) |

## Data layer (F1)

- `api.ts`: `courierApi`: `today`, `history`, `task`, `recordOutcome`, `handover`, `complete`, `parcel`. Every answer is
  checked against the response schemas; a mismatch throws `CourierResponseError`.
- `types.ts`: the courier DTOs (task summary and detail, task item, parcel detail, request bodies).
- `schemas.ts`: form schemas with the API's rules and messages, request builders (`deliveredRequest`, ...), and the
  response schemas.
- `lib/labels.ts`: words for task types, task statuses, outcomes, problems and failure reasons (the same words as
  dispatch), button words, routes.
- `lib/errors.ts`: `describeCourierError` → validation, not-found, closed, stale (reload: `TASK_STEP_NOT_ALLOWED`,
  `ASSIGNMENT_CHANGED`, `INVALID_STATUS_TRANSITION`), not-finished, other.

What a courier may do next always comes from the API (`allowedOutcomes`, `readyForHandover`, `canComplete`); the
frontend never works it out. `scheduledFor` is information only: a task for a later day can be worked now.

Tests: `tests/courier-data-layer.test.mts`.

## Temporary: `legacy/`

The Stage 0 screens (today's deliveries, parcel detail, delivered and failed forms) still use the old
delivery-based data layer in `legacy/`, which calls `/courier/deliveries/*` (no longer on the backend). They are
replaced by the task screens in F2 and removed with `legacy/` in F3.

## Layout

```text
courier/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── lib/          Labels, routes and error handling for the courier screens
├── legacy/       TEMPORARY: the old data layer of the Stage 0 screens (removed in F3)
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas: forms, request bodies and responses
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
