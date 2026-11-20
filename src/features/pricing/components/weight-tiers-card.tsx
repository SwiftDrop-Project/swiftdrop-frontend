import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminTariff } from "../admin-types";

/**
 * The weight charge for every billable kg from 1 to 50, as a compact grid. Kilograms included in the price are
 * marked. `tariff` null shows placeholders.
 */
export function WeightTiersCard({ tariff }: { tariff: AdminTariff | null }) {
  const titleId = React.useId();

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Weight charge"
        titleId={titleId}
        description={
          tariff ? (
            `${tariff.baseWeightKg} kg included, then ${formatRs(tariff.perKgFee)} for each extra kg. Billable weight is ` +
            `the greater of the actual and the volumetric weight (L × W × H ÷ ${tariff.volumetricDivisor.toLocaleString(
              "en-LK",
            )}), rounded up.`
          ) : (
            <Skeleton className="mt-1 h-4 w-72 max-w-full" />
          )
        }
      />
      <CardContent>
        {tariff ? (
          <dl
            aria-label="Weight charge for each billable kg"
            className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-grey-200 bg-grey-200 sm:grid-cols-3 lg:grid-cols-5"
          >
            {tariff.weightTiers.map((tier) => {
              const included = tier.billableKg <= tariff.baseWeightKg;
              return (
                <div
                  key={tier.billableKg}
                  className={cn("flex items-baseline justify-between gap-3 px-3 py-2", included ? "bg-grey-50" : "bg-white")}
                >
                  <dt className="text-body-sm text-grey-600 tabular-nums">{tier.billableKg} kg</dt>
                  <dd className="text-body-sm text-grey-900 tabular-nums">
                    {included ? "Included" : formatRs(tier.weightCharge)}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <Skeleton className="h-64 w-full rounded-lg" />
        )}
      </CardContent>
    </Card>
  );
}
