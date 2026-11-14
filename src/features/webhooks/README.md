# Webhooks

Merchant webhook subscriptions and the log of parcel events sent to merchant URLs (`/merchant/webhooks`).

| | |
|---|---|
| Backend module | `com.swiftdrop.webhooks` (`../swiftdrop-backend/src/main/java/com/swiftdrop/webhooks`) |
| Owner | chanuka (WP6) |
| Import as | `@/features/webhooks` (only what `index.ts` exports) |

## Built so far

- `WebhookList` (`/merchant/webhooks`): the merchant's endpoints with add, edit, send test, rotate secret and
  turn off/on; the signing secret is shown once (`SecretDialog`) and kept only in that dialog's state.
- `api.ts`: `webhooksApi` (list, create, update, turnOff, rotateSecret, sendTest).

Next: the webhook detail page with its delivery history and retry (`/merchant/webhooks/[id]`).

## Layout

```text
webhooks/
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
