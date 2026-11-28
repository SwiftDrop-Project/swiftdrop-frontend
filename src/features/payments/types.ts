// Types matching the backend payments module's DTOs (see ../swiftdrop-backend/API.md "Payments").

/** How the delivery fee is paid: the delivery's payment method (backend delivery.PaymentMethod). */
export type PaymentMethod = "ONLINE" | "AT_PICKUP" | "AT_DROP_OFF";

/** DUE: still to pay. PAID: paid by card or collected in cash. NOT_CHARGED: the delivery failed before it was paid. */
export type PaymentStatus = "DUE" | "PAID" | "NOT_CHARGED";

/** One delivery's payment (GET /payments). */
export interface Payment {
  id: string;
  parcelId: string;
  trackingNumber: string;
  bookedAt: string;
  /** null: booked before payment methods (treated as cash on delivery). */
  method: PaymentMethod | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  /** Only after a mock card payment, e.g. "VISA" and "4242". */
  cardBrand: string | null;
  cardLast4: string | null;
  /** Only while PAID. */
  paidAt: string | null;
}

/** GET /payments/summary: the two cards. "Due" is split into cash (for the courier) and online (to pay here). */
export interface PaymentSummary {
  currency: string;
  paidTotal: number;
  paidCount: number;
  dueTotal: number;
  dueCount: number;
  dueCashTotal: number;
  dueCashCount: number;
  dueOnlineTotal: number;
  dueOnlineCount: number;
  notChargedCount: number;
  /** Only when exactly one cash payment is due. */
  dueCashTrackingNumber: string | null;
}

/** Body of POST /payments/{id}/card: a mock card (test numbers only; nothing is stored or charged). */
export interface CardPaymentRequest {
  cardNumber: string;
  /** MM/YY */
  expiry: string;
  cvc: string;
  nameOnCard: string;
}
