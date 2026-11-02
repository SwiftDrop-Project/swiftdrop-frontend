# Tracking

Parcel tracking by tracking number, for customers and the public (`/track`), with live updates over Server-Sent Events.

| | |
|---|---|
| Backend module | `com.swiftdrop.tracking` (`../swiftdrop-backend/src/main/java/com/swiftdrop/tracking`) |
| Owner | TBD |
| Import as | `@/features/tracking` (only what `index.ts` exports) |

## Built so far

- `TrackParcelCard`: tracking-number form on the customer overview.

## Layout

```text
tracking/
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
