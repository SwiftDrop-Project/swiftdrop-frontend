import { Bike, Truck, type LucideIcon } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRs } from "@/lib/format";
import type { AdminTariff, VehicleTariff } from "../admin-types";
import { VEHICLE_LABEL } from "../labels";
import type { Vehicle } from "../types";

const VEHICLE_ICON: Record<Vehicle, LucideIcon> = {
  BIKE: Bike,
  TUK_TUK: Truck,
  LORRY: Truck,
};

/** The local legs: what each vehicle charges and the biggest parcel it takes. `tariff` null shows placeholders. */
export function VehicleTariffCard({ tariff }: { tariff: AdminTariff | null }) {
  const titleId = React.useId();

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Pickup and delivery"
        titleId={titleId}
        description="Each parcel goes on the smallest vehicle it fits, for both local legs"
      />
      <CardContent>
        <ul className="grid gap-3 md:grid-cols-3">
          {tariff
            ? tariff.vehicles.map((vehicle) => <VehicleItem key={vehicle.vehicle} vehicle={vehicle} />)
            : [0, 1, 2].map((index) => (
                <li key={index} className="flex flex-col gap-3 rounded-lg border border-grey-200 p-4" aria-hidden="true">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-4 w-40" />
                </li>
              ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function VehicleItem({ vehicle }: { vehicle: VehicleTariff }) {
  const Icon = VEHICLE_ICON[vehicle.vehicle];
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-grey-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label text-grey-900">{VEHICLE_LABEL[vehicle.vehicle]}</span>
        <Icon className="size-5 text-grey-500" aria-hidden="true" />
      </div>
      <dl className="flex flex-col gap-1">
        <dt className="sr-only">Both legs</dt>
        <dd className="text-h2 text-grey-900 tabular-nums">{formatRs(vehicle.bothLegs)}</dd>
        <dt className="sr-only">Each leg</dt>
        <dd className="text-body-sm text-grey-600 tabular-nums">{formatRs(vehicle.legFee)} for each leg</dd>
      </dl>
      <p className="border-t border-grey-100 pt-3 text-body-sm text-grey-700 tabular-nums">
        Up to {vehicle.maxLengthCm} × {vehicle.maxWidthCm} × {vehicle.maxHeightCm} cm and {vehicle.maxWeightKg} kg
      </p>
    </li>
  );
}
