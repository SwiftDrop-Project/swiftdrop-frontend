# Notifications

Emails (and later SMS) to users about their account and parcels. On the frontend: the top bar's notifications menu and notification settings.

| | |
|---|---|
| Backend module | `com.swiftdrop.notifications` (`../swiftdrop-backend/src/main/java/com/swiftdrop/notifications`) |
| Owner | TBD |
| Import as | `@/features/notifications` (only what `index.ts` exports) |

## Built so far

Nothing yet. Start with `types.ts` and `api.ts` from the backend contract, then the components.

## Layout

```text
notifications/
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
