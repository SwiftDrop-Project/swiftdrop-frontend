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
  - The default pickup address dropdown lists the real saved addresses (`GET /customer/addresses`).
- Saved addresses: `CustomerAddresses` (`/customer/addresses`)
  - The list (`useAddresses`, `GET /customer/addresses`), the default pickup address first with a "Default" badge,
    each with Make default (`PUT /customer/addresses/{id}/default`), Edit and Delete (after a confirmation,
    `DELETE /customer/addresses/{id}`; deleting the default leaves no default).
  - `AddressForm` beside the list (below it on smaller screens): "Add address" (`POST`) or, after Edit, "Edit
    address" (`PUT`). Fields: label, contact name, mobile, address line, city, district, 5-digit postal code,
    optional landmark, and "Use as my default pickup address". Rules and messages in `schemas.ts` match API.md; a new
    address starts with the customer's own name and mobile, and is ticked as default when there is none yet.
  - Up to 20 addresses: the form is replaced by a notice at 20 (the API answers `409 ADDRESS_LIMIT_REACHED`).
  - City is a field of its own (not in the first design) because a booking's pickup and recipient need it.

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
