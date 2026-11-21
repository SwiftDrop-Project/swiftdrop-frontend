import { History } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRs } from "@/lib/format";
import type { AdminRateCard, VehicleLimit } from "../admin-types";
import { VEHICLE_LABEL } from "../labels";

/** The "See older versions" button, so focus can go back to it when the older versions are hidden. */
export const SHOW_OLDER_VERSIONS_ID = "show-older-rate-cards";

interface RateCardSummaryProps {
  card: AdminRateCard | null;
  /** Shows the older versions' table at the top of the page. */
  onShowOlderVersions: () => void;
  /** True while that table is shown, so the button says so instead of offering it again. */
  olderVersionsShown: boolean;
}

/**
 * The active rate card: how a fee is worked out, and what each vehicle takes, with a button that opens the older
 * versions. `card` null shows placeholders.
 */
export function RateCardSummary({ card, onShowOlderVersions, olderVersionsShown }: RateCardSummaryProps) {
  const titleId = React.useId();
  const vehiclesId = React.useId();

  return (
    <>
      <Card aria-labelledby={titleId} aria-busy={card === null}>
        <CardHeader
          title="Rate card"
          titleId={titleId}
          description={
            card ? `Version ${card.version} · active since ${formatDate(card.createdAt)}` : <span aria-hidden="true" className="mt-1 block h-4 w-40 max-w-full animate-pulse rounded-md bg-grey-100" />
          }
        />
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 p-4 text-body-sm sm:p-6">
          {card ? (
            <>
              <Rule label="Base fee" value={formatRs(card.baseFee)} />
              <Rule label="Included weight" value={`${card.baseWeightKg} kg`} />
              <Rule label="Each extra kg" value={formatRs(card.perKgFee)} />
              <Rule label="Between branches, per km" value={formatRs(card.linehaulPerKm)} />
              <Rule label="Road factor" value={`× ${card.roadFactor.toFixed(2)}`} />
              <Rule label="Volumetric weight" value={`L × W × H ÷ ${card.volumetricDivisor.toLocaleString("en-LK")}`} />
              <Rule label="Cash on delivery handling" value={card.codFee === 0 ? "None" : formatRs(card.codFee)} />
            </>
          ) : (
            Array.from({ length: 7 }, (_, index) => (
              <React.Fragment key={index}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </React.Fragment>
            ))
          )}
        </dl>
        <div className="border-t border-grey-200 p-4 sm:px-6">
          <Button
            id={SHOW_OLDER_VERSIONS_ID}
            variant="secondary"
            className="w-full"
            onClick={onShowOlderVersions}
            disabled={card === null || olderVersionsShown}
          >
            <History aria-hidden="true" />
            {olderVersionsShown ? "Older versions shown above" : "See older versions"}
          </Button>
        </div>
        <p className="rounded-b-lg border-t border-grey-200 bg-grey-50 p-4 text-body-sm text-grey-700">
          Billable weight is the greater of the actual and the volumetric weight, rounded up to a whole kg.
        </p>
      </Card>

      <Card aria-labelledby={vehiclesId} aria-busy={card === null}>
        <CardHeader
          title="Vehicles"
          titleId={vehiclesId}
          description="Pickup and delivery use the first vehicle the parcel fits"
        />
        <ul className="flex flex-col">
          {card
            ? card.vehicles.map((vehicle) => <VehicleRow key={vehicle.vehicle} vehicle={vehicle} />)
            : [0, 1, 2].map((index) => (
                <li key={index} className="flex flex-col gap-2 border-b border-grey-100 p-4 last:border-0 sm:px-6">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-40" />
                </li>
              ))}
        </ul>
      </Card>
    </>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-grey-600">{label}</dt>
      <dd className="text-right text-grey-900 tabular-nums">{value}</dd>
    </>
  );
}

function VehicleRow({ vehicle }: { vehicle: VehicleLimit }) {
  return (
    <li className="flex flex-col gap-1 border-b border-grey-100 p-4 last:border-0 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-label text-grey-900">{VEHICLE_LABEL[vehicle.vehicle]}</span>
        <span className="text-label text-grey-900 tabular-nums">{formatRs(vehicle.legFee)} a leg</span>
      </div>
      <span className="text-body-sm text-grey-600 tabular-nums">
        Up to {vehicle.maxLengthCm} × {vehicle.maxWidthCm} × {vehicle.maxHeightCm} cm and {vehicle.maxWeightKg} kg
      </span>
    </li>
  );
}
