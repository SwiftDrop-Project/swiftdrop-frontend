import { apiFetch } from "@/lib/api";
import type { PageResponse } from "@/types";
import type { CardPaymentRequest, Payment, PaymentSummary } from "./types";

/** Payment endpoints (API.md "Payments"). */
export const paymentsApi = {
  /** GET /payments: one payment per delivery, newest booking first. */
  list: ({ page, size }: { page: number; size: number }, signal?: AbortSignal) =>
    apiFetch<PageResponse<Payment>>("/payments", { query: { page, size }, signal }),

  /** GET /payments/summary: paid to date and what is still due. */
  summary: (signal?: AbortSignal) => apiFetch<PaymentSummary>("/payments/summary", { signal }),

  /**
   * POST /payments/{id}/card: pays an online delivery with a mock card. 402 CARD_DECLINED for the decline test card,
   * 409 PAYMENT_NOT_PAYABLE when it isn't due online.
   */
  payByCard: (id: string, body: CardPaymentRequest) =>
    apiFetch<Payment>(`/payments/${encodeURIComponent(id)}/card`, { method: "POST", body }),
};
