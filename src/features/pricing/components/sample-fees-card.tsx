import { PackageX } from "lucide-react";
import * as React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { formatRs } from "@/lib/format";
import type { AdminTariff } from "../admin-types";
import { VEHICLE_LABEL } from "../labels";

/** "Same district" for 0 km, otherwise "100 km". */
function distanceLabel(km: number): string {
  return km === 0 ? "Same district" : `${Math.round(km)} km`;
}

/**
 * What typical parcels cost, by distance between the branches: one row per parcel, one column per distance.
 * `tariff` null shows placeholders.
 */
export function SampleFeesCard({ tariff }: { tariff: AdminTariff | null }) {
  const titleId = React.useId();
  const distances = tariff?.distancesKm ?? [0, 25, 50, 100, 200, 300];
  const columns = distances.length + 1;

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Fees for typical parcels"
        titleId={titleId}
        description="The full delivery fee by road distance between the pickup and drop-off branches"
      />
      <Table>
        <TableCaption className="sr-only">
          Delivery fee for typical parcels at each distance between branches
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-48">Parcel</TableHead>
            {distances.map((km) => (
              <TableHead key={km} className="text-right whitespace-nowrap">
                {distanceLabel(km)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tariff === null ? (
            <TableLoading columns={columns} rows={5} label="Loading the fees for typical parcels" />
          ) : tariff.samples.length === 0 ? (
            <TableEmpty columns={columns} icon={PackageX} title="No sample parcels" description="Nothing to show." />
          ) : (
            tariff.samples.map((sample) => (
              <TableRow key={sample.key}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-label text-grey-900">{sample.name}</span>
                    <span className="text-caption whitespace-nowrap text-grey-600 tabular-nums">
                      {sample.weightKg} kg · {sample.lengthCm} × {sample.widthCm} × {sample.heightCm} cm
                    </span>
                    <span className="text-caption whitespace-nowrap text-grey-500">
                      {sample.vehicle
                        ? `${VEHICLE_LABEL[sample.vehicle]} · charged for ${sample.billableWeightKg} kg`
                        : "No vehicle fits · needs a quote"}
                    </span>
                  </div>
                </TableCell>
                {sample.fees.map((fee) => (
                  <TableCell key={fee.distanceKm} className="text-right whitespace-nowrap tabular-nums">
                    {fee.total === null ? (
                      <span className="text-grey-500">Quote</span>
                    ) : (
                      <span className="text-grey-900">{formatRs(fee.total)}</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <p className="rounded-b-lg border-t border-grey-200 bg-grey-50 p-4 text-body-sm text-grey-700 sm:px-6">
        {tariff
          ? `Fee = ${tariff.baseFee > 0 ? "base fee + " : ""}weight charge + pickup and delivery legs + ${formatRs(
              tariff.linehaulPerKm,
            )} for each km between branches.${
              tariff.codFee > 0 ? ` Cash on delivery adds ${formatRs(tariff.codFee)}.` : " Cash on delivery adds nothing."
            }`
          : "Fee = weight charge + pickup and delivery legs + the charge between branches."}
      </p>
    </Card>
  );
}
