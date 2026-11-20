"use client";

import { History, RotateCw, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InlineNotice } from "@/components/ui/inline-notice";
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
import { formatDate, formatRs } from "@/lib/format";
import type { AdminRateCard, VehicleLimit } from "../admin-types";
import { useRateCardHistory } from "../hooks/use-admin-pricing";
import { VEHICLE_LABEL } from "../labels";
import type { Vehicle } from "../types";

interface OlderRateCardsProps {
  /** The active card from the page, to mark what changed since each older version. */
  active: AdminRateCard | null;
  /** Hides this table again. */
  onClose: () => void;
}

/**
 * The older rate card versions, newest first (GET /admin/pricing/rate-cards without the active one). Shown at the top
 * of the page when the admin asks for it; loads when it appears. Read only: "View" shows a version's rates and
 * vehicles, with the values that differ from the active card marked.
 */
export function OlderRateCards({ active, onClose }: OlderRateCardsProps) {
  const titleId = React.useId();
  const headingRef = React.useRef<HTMLDivElement>(null);
  const { state, retry } = useRateCardHistory();
  const [viewing, setViewing] = React.useState<AdminRateCard | null>(null);

  // It appears above the button that opened it: bring it into view and move focus to it.
  React.useEffect(() => {
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const cards = state.status === "ready" ? state.data.filter((card) => !card.active) : null;
  const current = active ?? (state.status === "ready" ? (state.data.find((card) => card.active) ?? null) : null);

  return (
    <Card aria-labelledby={titleId}>
      <div ref={headingRef} tabIndex={-1} className="rounded-t-lg outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
        <CardHeader
          title="Older rate card versions"
          titleId={titleId}
          description={
            current
              ? `Replaced by version ${current.version}, newest first. Parcels keep the version they were priced with.`
              : "Newest first. Parcels keep the version they were priced with."
          }
          aside={
            <>
              {cards ? (
                <span className="hidden text-body-sm text-grey-600 tabular-nums sm:inline">
                  {cards.length} {cards.length === 1 ? "version" : "versions"}
                </span>
              ) : null}
              <Button variant="secondary" onClick={onClose}>
                <X aria-hidden="true" />
                Hide
                <span className="sr-only"> older versions</span>
              </Button>
            </>
          }
        />
      </div>

      {state.status === "error" ? (
        <div className="p-4 sm:p-6">
          <InlineNotice tone="error" title="We couldn't load the older versions">
            <p>{state.message}</p>
            <Button variant="secondary" className="mt-3" onClick={retry}>
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
          </InlineNotice>
        </div>
      ) : (
        <Table>
          <TableCaption className="sr-only">Older rate card versions, newest first</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Base fee</TableHead>
              <TableHead className="text-right">Each extra kg</TableHead>
              <TableHead className="text-right">Per km</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards === null ? (
              <TableLoading columns={7} rows={4} label="Loading the older rate card versions" />
            ) : cards.length === 0 ? (
              <TableEmpty
                columns={7}
                icon={History}
                title="No older versions"
                description="The active rate card is the first one. Older versions appear here once it is replaced."
              />
            ) : (
              cards.map((card) => (
                <TableRow key={card.version}>
                  <TableCell className="text-label text-grey-900 tabular-nums">Version {card.version}</TableCell>
                  <TableCell>
                    {card.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Previous</Badge>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-grey-700">{formatDate(card.createdAt)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRs(card.baseFee)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRs(card.perKgFee)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {formatRs(card.linehaulPerKm)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="tertiary" onClick={() => setViewing(card)}>
                      View
                      <span className="sr-only"> version {card.version}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <RateCardDialog card={viewing} active={current} onClose={() => setViewing(null)} />
    </Card>
  );
}

/** One version's rates and vehicles. A previous version shows, next to each changed value, what it is now. */
function RateCardDialog({
  card,
  active,
  onClose,
}: {
  card: AdminRateCard | null;
  active: AdminRateCard | null;
  onClose: () => void;
}) {
  const compareTo = card && !card.active ? active : null;

  return (
    <Dialog open={card !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent size="lg">
        {card ? (
          <>
            <DialogHeader>
              <DialogTitle>Rate card version {card.version}</DialogTitle>
              <DialogDescription>
                {card.active
                  ? `Active · created ${formatDate(card.createdAt)}. Every new quote uses this card.`
                  : `Previous · created ${formatDate(card.createdAt)}. Kept unchanged for parcels priced with it.`}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-6">
              {compareTo ? (
                <p className="text-body-sm text-grey-600">
                  Values that changed show what they are in the active card (version {compareTo.version}).
                </p>
              ) : null}

              <section aria-label="Rates" className="flex flex-col gap-3">
                <h3 className="text-label text-grey-900">Rates</h3>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-body-sm">
                  <Value label="Base fee" value={formatRs(card.baseFee)} now={nowRs(compareTo?.baseFee, card.baseFee)} />
                  <Value
                    label="Included weight"
                    value={`${card.baseWeightKg} kg`}
                    now={changed(compareTo?.baseWeightKg, card.baseWeightKg, (value) => `${value} kg`)}
                  />
                  <Value
                    label="Each extra kg"
                    value={formatRs(card.perKgFee)}
                    now={nowRs(compareTo?.perKgFee, card.perKgFee)}
                  />
                  <Value
                    label="Between branches, per km"
                    value={formatRs(card.linehaulPerKm)}
                    now={nowRs(compareTo?.linehaulPerKm, card.linehaulPerKm)}
                  />
                  <Value
                    label="Road factor"
                    value={`× ${card.roadFactor.toFixed(2)}`}
                    now={changed(compareTo?.roadFactor, card.roadFactor, (value) => `× ${value.toFixed(2)}`)}
                  />
                  <Value
                    label="Volumetric divisor"
                    value={card.volumetricDivisor.toLocaleString("en-LK")}
                    now={changed(compareTo?.volumetricDivisor, card.volumetricDivisor, (value) =>
                      value.toLocaleString("en-LK"),
                    )}
                  />
                  <Value
                    label="Cash on delivery handling"
                    value={card.codFee === 0 ? "None" : formatRs(card.codFee)}
                    now={changed(compareTo?.codFee, card.codFee, (value) => (value === 0 ? "None" : formatRs(value)))}
                  />
                </dl>
              </section>

              <section aria-label="Vehicles" className="flex flex-col gap-3">
                <h3 className="text-label text-grey-900">Vehicles</h3>
                <ul className="flex flex-col rounded-lg border border-grey-200">
                  {card.vehicles.map((vehicle) => (
                    <VehicleItem
                      key={vehicle.vehicle}
                      vehicle={vehicle}
                      current={compareTo ? findVehicle(compareTo, vehicle.vehicle) : null}
                    />
                  ))}
                </ul>
              </section>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** The active card's value when it differs from this version's, formatted; otherwise null. */
function changed<T>(now: T | undefined, then: T, format: (value: T) => string): string | null {
  return now === undefined || now === then ? null : format(now);
}

function nowRs(now: number | undefined, then: number): string | null {
  return changed(now, then, formatRs);
}

function findVehicle(card: AdminRateCard, vehicle: Vehicle): VehicleLimit | null {
  return card.vehicles.find((item) => item.vehicle === vehicle) ?? null;
}

function Value({ label, value, now }: { label: string; value: string; now: string | null }) {
  return (
    <>
      <dt className="text-grey-600">{label}</dt>
      <dd className="text-right text-grey-900 tabular-nums">
        {value}
        {now ? <span className="block text-caption text-grey-500">Now {now}</span> : null}
      </dd>
    </>
  );
}

function size(vehicle: VehicleLimit): string {
  return `${vehicle.maxLengthCm} × ${vehicle.maxWidthCm} × ${vehicle.maxHeightCm} cm, ${vehicle.maxWeightKg} kg`;
}

function VehicleItem({ vehicle, current }: { vehicle: VehicleLimit; current: VehicleLimit | null }) {
  const feeNow = current && current.legFee !== vehicle.legFee ? formatRs(current.legFee) : null;
  const sizeNow = current && size(current) !== size(vehicle) ? size(current) : null;

  return (
    <li className="flex flex-col gap-1 border-b border-grey-100 p-4 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-label text-grey-900">{VEHICLE_LABEL[vehicle.vehicle]}</span>
        <span className="text-right text-label text-grey-900 tabular-nums">
          {formatRs(vehicle.legFee)} a leg
          {feeNow ? <span className="block text-caption font-normal text-grey-500">Now {feeNow}</span> : null}
        </span>
      </div>
      <span className="text-body-sm text-grey-600 tabular-nums">Up to {size(vehicle)}</span>
      {sizeNow ? <span className="text-caption text-grey-500">Now up to {sizeNow}</span> : null}
    </li>
  );
}
