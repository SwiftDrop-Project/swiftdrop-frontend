import { CreditCard, MapPin, Package } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { RadioCards, type RadioCardOption } from "@/components/ui/radio-cards";
import { TextButton } from "@/components/ui/text-link";
import { PAYMENT_METHOD_LABEL } from "../labels";
import type { PaymentMethod } from "../types";

const PAYMENT_OPTIONS: readonly RadioCardOption<PaymentMethod>[] = [
  {
    value: "ONLINE",
    label: PAYMENT_METHOD_LABEL.ONLINE,
    description: "Pay now by card. The payment gateway opens first.",
    icon: CreditCard,
  },
  {
    value: "AT_PICKUP",
    label: PAYMENT_METHOD_LABEL.AT_PICKUP,
    description: "Pay the courier in cash when they collect the parcel.",
    icon: Package,
  },
  {
    value: "AT_DROP_OFF",
    label: PAYMENT_METHOD_LABEL.AT_DROP_OFF,
    description: "The recipient pays the courier in cash when the parcel arrives.",
    icon: MapPin,
  },
];

interface PaymentMethodCardProps {
  /** null until the customer chooses: there is no default. */
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod) => void;
  error?: string;
  /** Goes on the first option, so the review step can move the focus here. */
  ref?: React.Ref<HTMLInputElement>;
  /** The card approved in the payment gateway, shown while Online payment is chosen. */
  onlineCard?: { cardBrand: string; cardLast4: string } | null;
  /** Opens the payment gateway again to approve another card. */
  onChangeCard?: () => void;
}

/**
 * How the delivery fee will be paid: online, at pickup or at drop-off. The review step requires a choice, and it is
 * sent with the booking as paymentMethod. Online payment counts as chosen only once a card is approved in the payment
 * gateway; the approved card is shown here.
 */
export function PaymentMethodCard({ value, onChange, error, ref, onlineCard, onChangeCard }: PaymentMethodCardProps) {
  const titleId = React.useId();

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader title="Payment" titleId={titleId} />
      <CardContent className="flex flex-col gap-4">
        <RadioCards
          ref={ref}
          name="paymentMethod"
          legend="How will the delivery fee be paid?"
          value={value}
          options={PAYMENT_OPTIONS}
          onChange={onChange}
          error={error}
        />
        {value === "ONLINE" && onlineCard ? (
          <InlineNotice tone="success" title={`Card ···· ${onlineCard.cardLast4} approved`}>
            The delivery fee is charged to this card when you create the delivery.{" "}
            {onChangeCard ? <TextButton onClick={onChangeCard}>Use another card</TextButton> : null}
          </InlineNotice>
        ) : null}
      </CardContent>
    </Card>
  );
}
