# Customer

Customer profile, saved pickup and delivery addresses, delivery history, receipts, and payments.

| | |
|---|---|
| Backend module | `com.swiftdrop.customer` (`../swiftdrop-backend/src/main/java/com/swiftdrop/customer`) |
| Work Package | WP2 |
| Owner | WP2 Owner |
| Import as | `@/features/customer` (only what `index.ts` exports) |

## Built so far

- Customer profile view: `CustomerProfileView` (`/customer/profile`)
  - Profile header card with avatar initials, email, registration date, delivery count, and saved addresses count.
  - Personal details card with name and mobile number update.
  - Delivery preferences card with default pickup address selection and preferred payment method.
  - Password and security card linking to Settings.

## Layout

```text
customer/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend customer DTOs
├── schemas.ts    zod schemas for customer forms
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
