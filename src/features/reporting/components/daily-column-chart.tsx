"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCount, formatDay } from "../lib/labels";
import type { DayCount } from "../types";

type CountKey = "created" | "delivered" | "failed";

export interface ChartSeries {
  key: CountKey;
  label: string;
  /** A theme background class for the mark, e.g. "bg-grey-700". Text never takes it. */
  markClass: string;
}

export interface TooltipRow {
  label: string;
  value: number;
  markClass: string;
}

interface DailyColumnChartProps {
  /** Every day of the range, oldest first. */
  days: DayCount[];
  /** Drawn from the baseline up, in this order (a stack when more than one). */
  series: ChartSeries[];
  /** What the tooltip lists for a day; every series of the report, not only the drawn ones. */
  tooltipRows: (day: DayCount) => TooltipRow[];
  /** Read by screen readers instead of the columns, e.g. "Parcels booked per day". */
  label: string;
}

/** Clean axis ticks: 0 and three steps of 1, 2 or 5 × a power of ten that reach the highest column. */
function ticks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 3;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw) ?? raw;
  const roundedStep = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / roundedStep) * roundedStep;
  const result: number[] = [];
  for (let value = 0; value <= top; value += roundedStep) result.push(value);
  return result;
}

/**
 * Columns per day (DESIGN.md colours; dataviz mark specs): at most 24px wide, 4px rounded top, square at the
 * baseline, a 2px surface gap between neighbours and between stacked parts. Each column has its own hover and
 * keyboard tooltip with every series for that day. The values are also in the page's table view, so nothing is
 * reachable only by hovering.
 */
export function DailyColumnChart({ days, series, tooltipRows, label }: DailyColumnChartProps) {
  const [active, setActive] = React.useState<number | null>(null);
  const totals = days.map((day) => series.reduce((sum, item) => sum + day[item.key], 0));
  const axis = ticks(Math.max(0, ...totals));
  const top = axis[axis.length - 1];
  const dense = days.length > 60;
  const labelEvery = Math.max(1, Math.ceil(days.length / 7));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* Y axis: clean ticks, muted, tabular so they align. */}
        <div className="relative h-44 w-10 shrink-0 text-right text-caption text-grey-500 tabular-nums" aria-hidden="true">
          {axis.map((value) => (
            <span
              key={value}
              className="absolute right-0 -translate-y-1/2"
              style={{ bottom: `${(value / top) * 100}%` }}
            >
              {formatCount(value)}
            </span>
          ))}
        </div>

        <div className="relative h-44 min-w-0 flex-1" onPointerLeave={() => setActive(null)}>
          {/* Hairline gridlines, one step off the surface. */}
          {axis.map((value) => (
            <span
              key={value}
              aria-hidden="true"
              className={cn("absolute inset-x-0 h-px", value === 0 ? "bg-grey-300" : "bg-grey-100")}
              style={{ bottom: `${(value / top) * 100}%` }}
            />
          ))}

          <div role="list" aria-label={label} className={cn("absolute inset-0 flex items-end", dense ? "gap-px" : "gap-0.5")}>
            {days.map((day, index) => {
              const rows = tooltipRows(day);
              const drawn = series.filter((item) => day[item.key] > 0);
              const description = `${formatDay(day.date)}: ${rows
                .map((row) => `${row.label} ${formatCount(row.value)}`)
                .join(", ")}`;
              return (
                <div
                  key={day.date}
                  role="listitem"
                  tabIndex={0}
                  aria-label={description}
                  className={cn(
                    "relative flex h-full min-w-0 flex-1 items-end justify-center rounded-sm outline-none",
                    "focus-visible:ring-2 focus-visible:ring-orange-600",
                    active === index ? "bg-grey-50" : null,
                  )}
                  onPointerEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive((current) => (current === index ? null : current))}
                >
                  <div
                    className={cn("flex w-full max-w-6 flex-col-reverse", dense ? "gap-px" : "gap-0.5")}
                    style={{ height: `${(totals[index] / top) * 100}%` }}
                  >
                    {drawn.map((item, position) => (
                      <span
                        key={item.key}
                        className={cn("block w-full", item.markClass, position === drawn.length - 1 && "rounded-t-sm")}
                        style={{ flexGrow: day[item.key], flexBasis: 0 }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {active !== null && days[active] ? (
            <ChartTooltip
              date={days[active].date}
              rows={tooltipRows(days[active])}
              position={(active + 0.5) / days.length}
            />
          ) : null}
        </div>
      </div>

      {/* X axis: a few dates, never one under every column. */}
      <div className="ml-12 flex text-caption text-grey-500" aria-hidden="true">
        {days.map((day, index) => (
          <span key={day.date} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
            {index % labelEvery === 0 || index === days.length - 1 ? formatDay(day.date).replace(/^\w+, /, "") : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Values lead, labels follow; a short line key in the series colour. Kept inside the chart's edges. */
function ChartTooltip({ date, rows, position }: { date: string; rows: TooltipRow[]; position: number }) {
  const align = position < 0.2 ? "translate-x-0" : position > 0.8 ? "-translate-x-full" : "-translate-x-1/2";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-0 z-10 flex min-w-40 flex-col gap-1.5 rounded-md border border-grey-200 bg-white p-3 shadow-overlay",
        align,
      )}
      style={{ left: `${position * 100}%` }}
    >
      <span className="text-caption text-grey-600">{formatDay(date)}</span>
      {rows.map((row) => (
        <span key={row.label} className="flex items-center gap-2 text-body-sm">
          <span className={cn("h-0.5 w-3 shrink-0 rounded-full", row.markClass)} />
          <span className="text-label text-grey-900 tabular-nums">{formatCount(row.value)}</span>
          <span className="text-grey-600">{row.label}</span>
        </span>
      ))}
    </div>
  );
}
