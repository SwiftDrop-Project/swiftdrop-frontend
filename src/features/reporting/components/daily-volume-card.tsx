"use client";

import { ChartColumn, Table2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount, formatDay } from "../lib/labels";
import type { DayCount } from "../types";
import { DailyColumnChart, type ChartSeries, type TooltipRow } from "./daily-column-chart";

const BOOKED: ChartSeries[] = [{ key: "created", label: "Booked", markClass: "bg-grey-700" }];

// Delivery outcomes: green and red are kept for these (DESIGN.md). Delivered always sits at the baseline and failed
// on top, with a 2px gap between them and a legend, so the two never rely on colour alone.
const OUTCOMES: ChartSeries[] = [
  { key: "delivered", label: "Delivered", markClass: "bg-success" },
  { key: "failed", label: "Failed", markClass: "bg-error" },
];

function tooltipRows(day: DayCount): TooltipRow[] {
  return [
    { label: "Booked", value: day.created, markClass: "bg-grey-700" },
    { label: "Delivered", value: day.delivered, markClass: "bg-success" },
    { label: "Failed", value: day.failed, markClass: "bg-error" },
  ];
}

/**
 * Parcels per day for the range: booked, then delivered and failed, as two charts that share the days. "Show table"
 * switches to the same numbers as a table. `days` null shows placeholders.
 */
export function DailyVolumeCard({ days }: { days: DayCount[] | null }) {
  const titleId = React.useId();
  const [asTable, setAsTable] = React.useState(false);

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Parcels per day"
        titleId={titleId}
        description="Booked, and how many reached delivered or failed, on each Sri Lanka day"
        aside={
          <Button variant="secondary" onClick={() => setAsTable((value) => !value)} disabled={days === null} aria-pressed={asTable}>
            {asTable ? <ChartColumn aria-hidden="true" /> : <Table2 aria-hidden="true" />}
            {asTable ? "Show chart" : "Show table"}
          </Button>
        }
      />

      {days === null ? (
        <CardContent className="flex flex-col gap-6" aria-hidden="true">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      ) : asTable ? (
        <DailyTable days={days} />
      ) : (
        <CardContent className="flex flex-col gap-8">
          <section aria-label="Booked per day" className="flex flex-col gap-3">
            <h3 className="text-label text-grey-900">Booked</h3>
            <DailyColumnChart days={days} series={BOOKED} tooltipRows={tooltipRows} label="Parcels booked per day" />
          </section>

          <section aria-label="Delivered and failed per day" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-label text-grey-900">Delivered and failed</h3>
              <ul className="flex items-center gap-4 text-body-sm text-grey-700" aria-label="Legend">
                {OUTCOMES.map((item) => (
                  <li key={item.key} className="flex items-center gap-2">
                    <span className={`size-3 rounded-sm ${item.markClass}`} aria-hidden="true" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
            <DailyColumnChart
              days={days}
              series={OUTCOMES}
              tooltipRows={tooltipRows}
              label="Parcels delivered and failed per day"
            />
          </section>
        </CardContent>
      )}
    </Card>
  );
}

/** The same numbers as the charts, newest day first, with totals. */
function DailyTable({ days }: { days: DayCount[] }) {
  const rows = [...days].reverse();
  const sum = (key: "created" | "delivered" | "failed") => days.reduce((total, day) => total + day[key], 0);

  return (
    <Table>
      <TableCaption className="sr-only">Parcels booked, delivered and failed on each day, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Day</TableHead>
          <TableHead className="text-right">Booked</TableHead>
          <TableHead className="text-right">Delivered</TableHead>
          <TableHead className="text-right">Failed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((day) => (
          <TableRow key={day.date}>
            <TableCell className="whitespace-nowrap text-grey-700">{formatDay(day.date)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(day.created)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(day.delivered)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(day.failed)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-grey-50">
          <TableCell className="text-label text-grey-900">Total</TableCell>
          <TableCell className="text-right text-label tabular-nums">{formatCount(sum("created"))}</TableCell>
          <TableCell className="text-right text-label tabular-nums">{formatCount(sum("delivered"))}</TableCell>
          <TableCell className="text-right text-label tabular-nums">{formatCount(sum("failed"))}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
