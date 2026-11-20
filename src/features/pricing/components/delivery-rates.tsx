"use client";

import { Coins, Package, Route, Scale, RotateCw, type LucideIcon } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRs } from "@/lib/format";
import type { AdminTariff } from "../admin-types";
import { useRateCardHistory, useTariff } from "../hooks/use-admin-pricing";
import { SampleFeesCard } from "./sample-fees-card";
import { VehicleTariffCard } from "./vehicle-tariff-card";
import { WeightTiersCard } from "./weight-tiers-card";

/**
 * The admin's Delivery Rates page (/admin/rates): what a rate card charges by weight, by vehicle and for typical
 * parcels. The active card by default; any older version can be picked to see what it charged. Read only.
 */
export function DeliveryRates() {
  /** undefined = the active card. */
  const [version, setVersion] = React.useState<number | undefined>(undefined);
  const { state, refreshing, retry } = useTariff(version);
  const history = useRateCardHistory();

  const tariff = state.status === "ready" ? state.data : null;
  const versions = history.state.status === "ready" ? history.state.data : null;
  const activeVersion = versions?.find((card) => card.active)?.version;

  if (state.status === "error") {
    return (
      <InlineNotice tone="error" title="We couldn't load the delivery rates">
        <p>{state.message}</p>
        <Button variant="secondary" className="mt-3" onClick={retry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </InlineNotice>
    );
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={tariff === null || refreshing}>
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2 sm:w-72">
            <Label htmlFor="rates-version">Rate card</Label>
            <Select
              id="rates-version"
              size="md"
              value={version === undefined ? "" : String(version)}
              onChange={(event) => setVersion(event.target.value === "" ? undefined : Number(event.target.value))}
              disabled={versions === null}
            >
              <option value="">{activeVersion ? `Version ${activeVersion} (active)` : "Active card"}</option>
              {(versions ?? [])
                .filter((card) => !card.active)
                .map((card) => (
                  <option key={card.version} value={card.version}>
                    Version {card.version} (previous)
                  </option>
                ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-body-sm text-grey-600">
            {tariff ? (
              <>
                {tariff.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Previous</Badge>}
                <span>
                  Version {tariff.rateCardVersion} · created {formatDate(tariff.createdAt)}
                </span>
                {refreshing ? <span className="text-grey-500">Loading…</span> : null}
              </>
            ) : (
              <Skeleton className="h-5 w-56" />
            )}
          </div>
        </CardContent>
      </Card>

      {tariff && !tariff.active ? (
        <InlineNotice tone="info" title={`Version ${tariff.rateCardVersion} is no longer used for new deliveries`}>
          <p>These are the rates it charged. Parcels booked with it keep these prices.</p>
        </InlineNotice>
      ) : null}

      <KeyFigures tariff={tariff} />
      <SampleFeesCard tariff={tariff} />
      <VehicleTariffCard tariff={tariff} />
      <WeightTiersCard tariff={tariff} />

      <p className="text-body-sm text-grey-600">
        Read only. Rates change through a new rate card version in the backend, so parcels keep the price they were
        booked with.
      </p>
    </div>
  );
}

interface Figure {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}

function figures(tariff: AdminTariff): Figure[] {
  return [
    {
      label: "Included weight",
      value: `${tariff.baseWeightKg} kg`,
      note: tariff.baseFee > 0 ? `Base fee ${formatRs(tariff.baseFee)}` : "No base fee",
      icon: Package,
    },
    {
      label: "Each extra kg",
      value: formatRs(tariff.perKgFee),
      note: "Of billable weight",
      icon: Scale,
    },
    {
      label: "Between branches",
      value: formatRs(tariff.linehaulPerKm),
      note: "For each road km",
      icon: Route,
    },
    {
      label: "Cash on delivery",
      value: tariff.codFee > 0 ? formatRs(tariff.codFee) : "No fee",
      note: "Handling, on top of the fee",
      icon: Coins,
    },
  ];
}

/** The four numbers every fee is built from. `tariff` null shows placeholders. */
function KeyFigures({ tariff }: { tariff: AdminTariff | null }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tariff
        ? figures(tariff).map(({ label, value, note, icon: Icon }) => (
            <div key={label} className="flex flex-col gap-3 rounded-lg border border-grey-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-label text-grey-700">{label}</dt>
                <Icon className="size-5 text-grey-500" aria-hidden="true" />
              </div>
              <dd className="flex flex-col gap-1">
                <span className="text-h1 text-grey-900 tabular-nums">{value}</span>
                <span className="text-body-sm text-grey-600">{note}</span>
              </dd>
            </div>
          ))
        : [0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-lg border border-grey-200 bg-white p-4"
              aria-hidden="true"
            >
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
    </dl>
  );
}
