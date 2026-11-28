"use client";

import { toast } from "@/components/ui/toast";
import { formatRs, formatTrackingNumber } from "@/lib/format";
import { paymentsApi } from "../api";
import type { Payment } from "../types";
import { CardDialog } from "./card-dialog";

/**
 * "Pay now" for an online delivery on the Payments page (POST /payments/{id}/card). The card details stay in the
 * form and are sent once; only the brand and last 4 digits come back.
 */
export function PayByCardDialog({
  payment,
  onClose,
  onPaid,
}: {
  /** The payment to pay; null when the dialog is closed. */
  payment: Payment | null;
  onClose: () => void;
  onPaid: (paid: Payment) => void;
}) {
  return (
    <CardDialog
      open={payment !== null}
      title={payment ? `Pay ${formatRs(payment.amount)}` : "Pay"}
      description={
        payment ? (
          <>
            Delivery fee for <span className="tabular-nums">{formatTrackingNumber(payment.trackingNumber)}</span>.
            This is a mock card payment: nothing is charged.
          </>
        ) : null
      }
      submitLabel={payment ? `Pay ${formatRs(payment.amount)}` : "Pay"}
      onClose={onClose}
      onSubmit={async (card) => {
        if (!payment) return;
        const paid = await paymentsApi.payByCard(payment.id, card);
        toast({
          tone: "success",
          title: "Payment complete",
          description: `${formatRs(paid.amount)} paid for ${formatTrackingNumber(paid.trackingNumber)}.`,
        });
        onPaid(paid);
      }}
    />
  );
}
