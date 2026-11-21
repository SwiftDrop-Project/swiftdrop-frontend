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
- `WebhookDetail` (`/merchant/webhooks/[id]`): one webhook with its delivery history (status filter, pages of
  20, retry on failed deliveries, refreshes every 3 s while a delivery is about to be sent) and a setup guide
  (payload, headers, signature check in Node.js, Python and PHP).
- `AdminWebhookLogs` (`/admin/webhooks`, ADMIN): every merchant's deliveries with a merchant filter (names from
  `GET /admin/merchants?status=APPROVED`, `useMerchantNames`), the same search, event, status and date filters,
  retry on failed deliveries, and the short error code (e.g. `HTTP_503`) next to the plain-words result. The old
  `/admin/merchant/webhooks` and `/admin/merchant/webhook-logs` placeholders redirect here.
- Shared by both delivery lists: `DeliveryFilters`, `DeliveryList` (`delivery-parts.tsx`), `useDeliveryFilters`, and
  `useDeliveries`, which takes a load function so it works for one webhook or for the admin list.
- Limits (API.md "Webhooks", "Limits"): after "Send test" the button counts down 10 s ("Send test (8 s)"), on the
  detail page and in the ⋯ menu alike; a 429 on Send test or Retry shows "Try again in N seconds" and counts down its
  `Retry-After` (`use-cooldown.ts`). Only a convenience: the backend enforces the limits.
- 409 `WEBHOOK_CHANGED` (someone changed the webhook at the same moment): the message is shown and the list reloads
  without flashing (`useWebhooks().refresh`), so the merchant sees the latest version.
- `api.ts`: `webhooksApi` (list, create, update, turnOff, rotateSecret, sendTest, deliveries, retry) and
  `adminWebhooksApi` (deliveries, retry).

Next: a parcel's webhook messages (merchant Orders side panel, admin parcel page).

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
