# Payments

One payment record for every customer delivery, and paying online deliveries with a mock card.

| | |
|---|---|
| Backend module | `com.swiftdrop.payments` (`../swiftdrop-backend/src/main/java/com/swiftdrop/payments`) |
| Work Package | WP2 |
| Import as | `@/features/payments` (only what `index.ts` exports) |

## Built so far

- `CustomerPayments` (`/customer/payments`):
  - "Paid to date" and "Due" cards (`GET /payments/summary`). "Due" names the delivery when one cash payment is due
    ("Cash to hand to the courier for SD 2611 0048 17") and adds what is still to pay online.
  - Payment history (`GET /payments`, newest booking first, 20 a page): date, tracking number, method, status, amount.
    Cards on phones, a table from md up.
  - Methods (`labels.ts`) follow the delivery's payment method: Online is "Mock card" ("Mock card ···· 4242" once paid),
    Pay at pickup is "Cash at pickup", Pay at drop-off (and parcels booked before payment methods) "Cash on delivery".
  - Statuses: Paid (green), Due (outline: "Due on delivery" / "Due at pickup" for cash), Not charged (grey) for a failed
    delivery. Cash turns Paid by itself when the courier collects it.
  - "Pay now" on an online payment that is due opens `PayByCardDialog` (`POST /payments/{id}/card`): a mock card that
    accepts only test numbers (4242 4242 4242 4242 approved, 4000 0000 0000 0002 declined). Browser autofill is off so
    a real saved card is never offered; only the brand and last 4 digits are kept.

## Layout

```text
payments/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── labels.ts     Method and status wording
├── types.ts      Types matching the backend payments DTOs
├── schemas.ts    zod schema for the card form
└── index.ts      Public exports: the only file other code may import
```

## Used by other features

- `OnlinePaymentGateway` (Create delivery, `@/features/delivery`): the payment gateway shown when the customer picks
  Online payment. It approves the mock card with `POST /payments/card-check` (nothing charged or stored; the decline
  card stops here), and returns the card, kept only in the page's memory. Create delivery then pays the new delivery
  with `paymentsApi.payParcelByCard` (`POST /payments/parcels/{parcelId}/card`).
- `CardDialog` is the shared card form behind both `PayByCardDialog` and the gateway.
