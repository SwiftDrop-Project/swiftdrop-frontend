import { Banknote } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { feePaidLabel, type CashToCollect } from "../lib/delivery-fee";
import type { DeliveryFee } from "../types";

/**
 * The cash reminder of a live step: one line when there is one amount to collect, plus the delivery fee and the cash
 * on delivery on their own lines when the recipient pays both (with the total only when the same currency). The same
 * grey box the cash-on-delivery reminder always used.
 */
export function CashToCollectNotice({ collect }: { collect: CashToCollect }) {
  const both = collect.fee !== null && collect.cod !== null;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-grey-200 bg-grey-50 px-3 py-2 text-grey-900 tabular-nums">
      <p className="flex items-center gap-2 text-label">
        <Banknote className="size-5 shrink-0 text-grey-700" aria-hidden="true" />
        {collect.summary}
      </p>
      {both ? (
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 pl-7 text-body-sm">
          <dt className="text-grey-600">Delivery fee</dt>
          <dd>{collect.fee}</dd>
          <dt className="text-grey-600">Cash on delivery</dt>
          <dd>{collect.cod}</dd>
          {collect.total ? (
            <>
              <dt className="text-grey-600">Total cash</dt>
              <dd className="text-label">{collect.total}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

/**
 * The green "Delivery fee collected" / "Already Paid" badge, only when the backend recorded the payment. Renders
 * nothing while the fee is unpaid (an ONLINE choice alone is never paid).
 */
export function FeePaidBadge({ fee }: { fee: Pick<DeliveryFee, "status"> | null }) {
  const label = feePaidLabel(fee);
  return label ? <Badge tone="success">{label}</Badge> : null;
}

/**
 * "I collected the Rs. 522.60 delivery fee from the sender": the courier's confirmation, required by the backend when
 * this status change collects the fee. Controlled by the form; `error` shows under it.
 */
export function FeeConfirmationField({
  label,
  checked,
  onCheckedChange,
  error,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const errorId = React.useId();
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-3 rounded-md border border-grey-200 p-3 text-body-sm text-grey-900">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5"
        />
        <span className="min-w-0 tabular-nums">{label}</span>
      </label>
      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
