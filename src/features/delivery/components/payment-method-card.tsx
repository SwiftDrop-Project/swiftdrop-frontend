import { CreditCard, MapPin, Package } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioCards, type RadioCardOption } from "@/components/ui/radio-cards";
import { PAYMENT_METHOD_LABEL } from "../labels";
import type { PaymentMethod } from "../types";

const PAYMENT_OPTIONS: readonly RadioCardOption<PaymentMethod>[] = [
  {
    value: "ONLINE",
    label: PAYMENT_METHOD_LABEL.ONLINE,
    description: "Pay now by card or online banking.",
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
}

/**
 * How the delivery fee will be paid: online, at pickup or at drop-off. The review step requires a choice.
 * UI only for now: the choice isn't sent with the booking yet (see PaymentMethod).
 */
export function PaymentMethodCard({ value, onChange, error, ref }: PaymentMethodCardProps) {
  const titleId = React.useId();

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader title="Payment" titleId={titleId} />
      <CardContent>
        <RadioCards
          ref={ref}
          name="paymentMethod"
          legend="How will the delivery fee be paid?"
          value={value}
          options={PAYMENT_OPTIONS}
          onChange={onChange}
          error={error}
        />
      </CardContent>
    </Card>
  );
}
