import type { BadgeTone } from "@/components/ui/badge";
import type { Payment } from "./types";

/** "Mock card ···· 4242", "Cash at pickup" or "Cash on delivery" (also for parcels booked before payment methods). */
export function methodLabel(payment: Payment): string {
  if (payment.method === "ONLINE") {
    return payment.cardLast4 ? `Mock card ···· ${payment.cardLast4}` : "Mock card";
  }
  return payment.method === "AT_PICKUP" ? "Cash at pickup" : "Cash on delivery";
}

/** An online payment that can be paid here now. */
export function canPayByCard(payment: Payment): boolean {
  return payment.method === "ONLINE" && payment.status === "DUE";
}

/**
 * The status badge. Green only for Paid; Due is an outline (cash "Due on delivery" / "Due at pickup", online "Due") and
 * Not charged is grey. DESIGN.md has no yellow, and orange is only for actions.
 */
export function statusBadge(payment: Payment): { label: string; tone: BadgeTone } {
  switch (payment.status) {
    case "PAID":
      return { label: "Paid", tone: "success" };
    case "NOT_CHARGED":
      return { label: "Not charged", tone: "neutral" };
    default:
      if (payment.method === "ONLINE") return { label: "Due", tone: "outline" };
      return { label: payment.method === "AT_PICKUP" ? "Due at pickup" : "Due on delivery", tone: "outline" };
  }
}
