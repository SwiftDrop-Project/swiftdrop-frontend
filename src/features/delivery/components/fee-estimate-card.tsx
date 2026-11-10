import { Info } from "lucide-react";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FeeEstimate } from "../fee-estimate";

interface Stop {
  /** District name, e.g. "Colombo". */
  district: string;
  city: string;
}

interface FeeEstimateCardProps {
  estimate: FeeEstimate;
  pickup: Stop;
  dropOff: Stop;
  weightKg: number;
  /** Cash the courier collects; null when the parcel is paid for. */
  codAmount: number | null;
  className?: string;
}

/**
 * The review step's summary: the estimated fee, the route from pickup to drop-off, and what the courier carries
 * and collects. Beside the review on wide screens, above the buttons on smaller ones.
 */
export function FeeEstimateCard({ estimate, pickup, dropOff, weightKg, codAmount, className }: FeeEstimateCardProps) {
  const titleId = React.useId();

  return (
    <Card aria-labelledby={titleId} className={cn("flex flex-col", className)}>
      <div className="flex flex-col gap-1 p-6">
        <h2 id={titleId} className="text-label text-grey-600">
          Estimated fee
        </h2>
        <p className="text-display text-grey-900 tabular-nums">{formatRs(estimate.amount)}</p>
        <p className="text-body-sm text-grey-600">{estimate.basis}</p>
      </div>

      <ol aria-label="Route" className="flex flex-col border-t border-grey-200 p-6">
        <RouteStop label="Pickup" stop={pickup} />
        <RouteStop label="Drop-off" stop={dropOff} last />
      </ol>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-grey-200 p-6 text-body-sm">
        <dt className="text-grey-600">Weight</dt>
        <dd className="text-right text-grey-900 tabular-nums">{weightKg} kg</dd>
        <dt className="text-grey-600">Cash to collect</dt>
        <dd className="text-right text-grey-900 tabular-nums">{codAmount === null ? "None" : formatRs(codAmount)}</dd>
      </dl>

      <div className="flex gap-2 rounded-b-lg border-t border-grey-200 bg-grey-50 p-4 text-body-sm text-grey-700">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>The final fee is confirmed when you create the delivery, together with the tracking number.</p>
      </div>
    </Card>
  );
}

/** One end of the route: an open dot for the pickup, a filled one for the drop-off, joined by a line. */
function RouteStop({ label, stop, last = false }: { label: string; stop: Stop; last?: boolean }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last ? (
        <span aria-hidden="true" className="absolute top-5 bottom-1 left-1.5 w-px -translate-x-1/2 bg-grey-300" />
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-1.5 size-3 shrink-0 rounded-full border-2 border-grey-900",
          last ? "bg-grey-900" : "bg-white",
        )}
      />
      <div className="flex min-w-0 flex-col">
        <span className="text-caption text-grey-600">{label}</span>
        <span className="text-label text-grey-900">{stop.district}</span>
        <span className="text-body-sm wrap-break-word text-grey-600">{stop.city}</span>
      </div>
    </li>
  );
}
