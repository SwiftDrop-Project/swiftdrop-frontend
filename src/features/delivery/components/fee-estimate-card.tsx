import { Info } from "lucide-react";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TextButton } from "@/components/ui/text-link";
import {
  FEE_COMPONENT_LABEL,
  VEHICLE_LABEL,
  type FeeComponent,
  type FeeEstimate,
  type FeeEstimateState,
} from "@/features/pricing";
import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Stop {
  /** District name, e.g. "Colombo". */
  district: string;
  city: string;
}

interface FeeEstimateCardProps {
  /** POST /pricing/estimate for this parcel, from useFeeEstimate. */
  estimate: FeeEstimateState;
  onRetry: () => void;
  pickup: Stop;
  dropOff: Stop;
  weightKg: number;
  /** e.g. "40 × 30 × 12 cm". */
  size: string;
  /** Cash the courier collects; null when the parcel is paid for. */
  codAmount: number | null;
  className?: string;
}

/**
 * The review step's summary: the estimated fee with how it adds up, the route from pickup to drop-off, and what
 * the courier carries and collects. Beside the review on wide screens, above the buttons on smaller ones.
 */
export function FeeEstimateCard({
  estimate,
  onRetry,
  pickup,
  dropOff,
  weightKg,
  size,
  codAmount,
  className,
}: FeeEstimateCardProps) {
  const titleId = React.useId();
  const quote = estimate.status === "ready" && estimate.estimate.total !== null ? estimate.estimate : null;

  return (
    <Card aria-labelledby={titleId} className={cn("flex flex-col", className)}>
      <div className="flex flex-col gap-1 p-6" aria-live="polite">
        <h2 id={titleId} className="text-label text-grey-600">
          Estimated fee
        </h2>
        <EstimateSummary estimate={estimate} onRetry={onRetry} />
      </div>

      {quote ? <FeeLines estimate={quote} /> : null}

      <ol aria-label="Route" className="flex flex-col border-t border-grey-200 p-6">
        <RouteStop label="Pickup" stop={pickup} />
        <RouteStop label="Drop-off" stop={dropOff} last />
      </ol>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-grey-200 p-6 text-body-sm">
        <dt className="text-grey-600">Weight</dt>
        <dd className="text-right text-grey-900 tabular-nums">{weightKg} kg</dd>
        <dt className="text-grey-600">Packed size</dt>
        <dd className="text-right text-grey-900 tabular-nums">{size}</dd>
        <dt className="text-grey-600">Cash to collect</dt>
        <dd className="text-right text-grey-900 tabular-nums">{codAmount === null ? "None" : formatRs(codAmount)}</dd>
      </dl>

      <div className="flex gap-2 rounded-b-lg border-t border-grey-200 bg-grey-50 p-4 text-body-sm text-grey-700">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>The fee is worked out again when you create the delivery, and comes back with the tracking number.</p>
      </div>
    </Card>
  );
}

/** The amount and what it is based on; or loading, an error with a retry, or "needs a quote". */
function EstimateSummary({ estimate, onRetry }: { estimate: FeeEstimateState; onRetry: () => void }) {
  if (estimate.status === "loading") {
    return (
      <>
        <p className="sr-only">Working out the fee…</p>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-52" />
      </>
    );
  }

  if (estimate.status === "error") {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-body-sm text-grey-700">{estimate.message}</p>
        <TextButton onClick={onRetry}>Try again</TextButton>
      </div>
    );
  }

  const quote = estimate.estimate;
  if (quote.total === null) {
    return (
      <>
        <p className="text-h3 text-grey-900">Needs a quote</p>
        <p className="text-body-sm text-grey-600">
          This parcel is too big or too heavy for our vehicles. Contact us for a quote.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-display text-grey-900 tabular-nums">{formatRs(quote.total)}</p>
      <p className="text-body-sm text-grey-600">{basis(quote)}</p>
    </>
  );
}

/** "Bike for pickup and drop-off · Charged for 3 kg". */
function basis(estimate: FeeEstimate): string {
  const charged = `Charged for ${estimate.billableWeightKg} kg`;
  return estimate.vehicle ? `${VEHICLE_LABEL[estimate.vehicle]} for pickup and drop-off · ${charged}` : charged;
}

/** How the fee adds up, one row per line in the API's order. */
function FeeLines({ estimate }: { estimate: FeeEstimate }) {
  return (
    <dl
      aria-label="How the fee adds up"
      className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-grey-200 p-6 text-body-sm"
    >
      {estimate.lines.map((line) => (
        <React.Fragment key={line.component}>
          <dt className="text-grey-600">{lineLabel(line.component, estimate)}</dt>
          <dd className="text-right text-grey-900 tabular-nums">{formatRs(line.amount)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** The line's words; the line between branches also says how far apart they are. */
function lineLabel(component: FeeComponent, estimate: FeeEstimate): string {
  const label = FEE_COMPONENT_LABEL[component];
  if (component === "LINEHAUL" && estimate.distanceKm) {
    return `${label} (${Math.round(estimate.distanceKm)} km)`;
  }
  return label;
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
