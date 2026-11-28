import { formatRs } from "@/lib/format";
import type { CourierDelivery, DeliveryFee, FeePaymentMethod } from "../types";

/*
 * The delivery fee on the courier screens. The backend sends the fee as booked, how the customer chose to pay it, its
 * payment status (from the payment it recorded) and `collectOn`: the step's status change that must confirm the cash
 * collection. These words say "paid" only when the backend recorded a payment: an online payment is never shown as
 * paid because the customer chose ONLINE.
 *
 * The delivery fee (SwiftDrop's charge) is never the cash on delivery (`codAmount`, the price of the goods, collected
 * for the sender): they are shown on their own lines, and added up only when both are due here and in rupees.
 */

/** How the fee is paid, in words. */
export const FEE_PAYMENT_LABEL: Record<FeePaymentMethod, string> = {
  ONLINE: "Online",
  AT_PICKUP: "Cash at pickup – the sender pays",
  AT_DROP_OFF: "Cash at drop-off – the recipient pays",
};

/** A parcel booked before payment methods. */
export const PAYMENT_NOT_RECORDED = "Payment method not recorded";

/** The currency of the cash on delivery: the API sends it in rupees. */
const COD_CURRENCY = "LKR";

/** How the fee is paid. */
export function paymentMethodText(fee: Pick<DeliveryFee, "paymentMethod">): string {
  return fee.paymentMethod ? FEE_PAYMENT_LABEL[fee.paymentMethod] : PAYMENT_NOT_RECORDED;
}

/** Under an ONLINE fee, verified or not: the courier never collects it. */
export const NO_FEE_COLLECTION = "No delivery fee collection required";

/** The line under the payment method: only for ONLINE, otherwise null. */
export function feeCollectionNote(fee: Pick<DeliveryFee, "paymentMethod"> | null): string | null {
  return fee?.paymentMethod === "ONLINE" ? NO_FEE_COLLECTION : null;
}

/**
 * The green indicator of a paid fee, only from the payment the backend recorded: "Delivery fee collected" (cash) or
 * "Already Paid" (ONLINE_VERIFIED). Null while unpaid, so an ONLINE choice alone never shows as paid.
 */
export function feePaidLabel(fee: Pick<DeliveryFee, "status"> | null): string | null {
  if (fee?.status === "CASH_COLLECTED") return "Delivery fee collected";
  if (fee?.status === "ONLINE_VERIFIED") return "Already Paid";
  return null;
}

/** "Rs. 522.60" for rupees; any other currency with its code, e.g. "USD 12.50". */
export function formatFee(fee: Pick<DeliveryFee, "amount" | "currency">): string {
  return fee.currency === COD_CURRENCY ? formatRs(fee.amount) : `${fee.currency} ${fee.amount.toFixed(2)}`;
}

/** What to collect in cash at this stop, each amount already formatted. */
export interface CashToCollect {
  /** Who pays here. */
  payer: "sender" | "recipient";
  /** The delivery fee, when it is still to be paid at this stop; otherwise null. */
  fee: string | null;
  /** The cash on delivery, when it is collected at this stop; otherwise null. */
  cod: string | null;
  /** Fee + cash on delivery, only when both are due here and in the same currency; otherwise null. */
  total: string | null;
  /** One line that says what to collect. */
  summary: string;
}

/**
 * What the courier collects in cash at this stop, or null when nothing. Only for a live step (`actionable`: never a
 * finished, closed or history entry):
 * - an AT_PICKUP fee not collected yet: from the sender while the parcel can be picked up;
 * - an AT_DROP_OFF fee not collected yet: from the recipient on a delivery still going to them (not failed);
 * - the cash on delivery: as before, on every live delivery step.
 * A collected fee, an ONLINE fee (verified or not), an unknown method or a missing fee add nothing.
 */
export function cashToCollect(
  delivery: Pick<CourierDelivery, "codAmount" | "deliveryFee" | "nextStatuses" | "task">,
  actionable: boolean,
): CashToCollect | null {
  if (!actionable) return null;
  const { task } = delivery;
  const fee = delivery.deliveryFee?.status === "AWAITING_CASH_COLLECTION" ? delivery.deliveryFee : null;

  if (task.type === "PICKUP") {
    if (fee?.paymentMethod !== "AT_PICKUP" || !delivery.nextStatuses.includes("PICKED_UP")) return null;
    const amount = formatFee(fee);
    return { payer: "sender", fee: amount, cod: null, total: null, summary: `Collect ${amount} delivery fee from the sender` };
  }

  if (task.type !== "DELIVERY") return null;
  const feeHere = fee?.paymentMethod === "AT_DROP_OFF" && task.outcome !== "FAILED" ? fee : null;
  const codHere = delivery.codAmount;
  if (feeHere && codHere !== null) {
    // In cents, so two amounts with 2 decimals never add up to a float like 2972.6000000000004.
    const total =
      feeHere.currency === COD_CURRENCY ? formatRs(Math.round(feeHere.amount * 100 + codHere * 100) / 100) : null;
    return {
      payer: "recipient",
      fee: formatFee(feeHere),
      cod: formatRs(codHere),
      total,
      summary: total
        ? `Collect ${total} in cash from the recipient`
        : "Collect the delivery fee and cash on delivery from the recipient",
    };
  }
  if (feeHere) {
    const amount = formatFee(feeHere);
    return { payer: "recipient", fee: amount, cod: null, total: null, summary: `Collect ${amount} delivery fee from the recipient` };
  }
  if (codHere !== null) {
    // The cash on delivery on its own: the words the screens have always used.
    const amount = formatRs(codHere);
    return { payer: "recipient", fee: null, cod: amount, total: null, summary: `Collect ${amount} in cash` };
  }
  return null;
}

/**
 * The confirmation the courier must tick to set `status` now ("I collected Rs. 522.60 delivery fee from the
 * sender"), or null when this status change collects nothing. Exactly when the backend says so (`collectOn`), so the
 * form never sends `feeCollected` where the backend refuses it.
 */
export function feeConfirmationLabel(
  delivery: Pick<CourierDelivery, "deliveryFee">,
  status: "PICKED_UP" | "DELIVERED",
): string | null {
  const fee = delivery.deliveryFee;
  if (!fee || fee.collectOn !== status) return null;
  return `I collected the ${formatFee(fee)} delivery fee from the ${status === "PICKED_UP" ? "sender" : "recipient"}`;
}

/** Shown under the checkbox when the courier tries to confirm without ticking it. */
export const FEE_CONFIRMATION_REQUIRED = "Collect the delivery fee and tick this box to continue.";

/**
 * The cash on delivery confirmation of the DELIVERED dialog ("I collected the Rs. 2,450.00 cash on delivery from the
 * recipient"), or null when the parcel has no cash on delivery. Kept apart from the delivery fee's confirmation.
 *
 * Frontend only for now: the courier must tick it to mark the parcel delivered, but nothing is sent or recorded (the
 * backend keeps no cash on delivery payments).
 */
export function codConfirmationLabel(delivery: Pick<CourierDelivery, "codAmount">): string | null {
  return delivery.codAmount === null ? null : `I collected the ${formatRs(delivery.codAmount)} cash on delivery from the recipient`;
}

/** Shown under the cash on delivery checkbox when the courier tries to confirm without ticking it. */
export const COD_CONFIRMATION_REQUIRED = "Collect the cash on delivery and tick this box to continue.";
