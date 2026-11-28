"use client";

import { formatRs } from "@/lib/format";
import { paymentsApi } from "../api";
import type { ApprovedCard } from "../types";
import { CardDialog } from "./card-dialog";

/**
 * The payment gateway of Create delivery (POST /payments/card-check). The customer enters the mock card here before
 * the delivery exists; the card is approved (a declined card stops here) but nothing is charged yet. Create delivery
 * then books the parcel and pays its fee with this card ({@link paymentsApi.payParcelByCard}) in the same click.
 */
export function OnlinePaymentGateway({
  open,
  amount,
  onClose,
  onApproved,
}: {
  open: boolean;
  /** The estimated fee, shown on the gateway; null while it is not known. */
  amount: number | null;
  onClose: () => void;
  onApproved: (card: ApprovedCard) => void;
}) {
  const shown = amount === null ? null : formatRs(amount);
  return (
    <CardDialog
      open={open}
      title="Online payment"
      description={
        <>
          {shown ? (
            <>
              Delivery fee <span className="tabular-nums">{shown}</span> (the fee is confirmed when the delivery is
              created).{" "}
            </>
          ) : null}
          Approve the card now; it is charged when you create the delivery. This is a mock card payment: no real money
          moves.
        </>
      }
      submitLabel={shown ? `Approve ${shown}` : "Approve payment"}
      onClose={onClose}
      onSubmit={async (card) => {
        const checked = await paymentsApi.checkCard(card);
        onApproved({ card, cardBrand: checked.cardBrand, cardLast4: checked.cardLast4 });
      }}
    />
  );
}
