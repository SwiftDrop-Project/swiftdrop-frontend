import { ArrowDownRight, ArrowUpRight, CircleCheck, CircleX, Gauge, Minus, PackagePlus, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCount, formatPercent } from "../lib/labels";
import type { ReportSummary } from "../types";

/** Whether a rise in this figure is good news, bad news, or neither (booked parcels). */
type Good = "up" | "down" | "neither";

interface Figure {
  label: string;
  value: string;
  icon: LucideIcon;
  /** The change against the previous period, already worded. */
  delta: { text: string; direction: "up" | "down" | "same"; tone: "good" | "bad" | "neutral" };
}

function delta(now: number, before: number, good: Good, unit: "percent" | "points"): Figure["delta"] {
  if (unit === "points") {
    const change = Math.round((now - before) * 10) / 10;
    const direction = change > 0 ? "up" : change < 0 ? "down" : "same";
    return {
      text: direction === "same" ? "No change" : `${Math.abs(change).toFixed(1)} points`,
      direction,
      tone: tone(direction, good),
    };
  }
  if (before === 0) {
    const direction = now > 0 ? "up" : "same";
    return { text: now > 0 ? "New this period" : "No change", direction, tone: tone(direction, good) };
  }
  const change = Math.round(((now - before) / before) * 100);
  const direction = change > 0 ? "up" : change < 0 ? "down" : "same";
  return { text: direction === "same" ? "No change" : `${Math.abs(change)}%`, direction, tone: tone(direction, good) };
}

function tone(direction: "up" | "down" | "same", good: Good): "good" | "bad" | "neutral" {
  if (direction === "same" || good === "neither") return "neutral";
  return direction === good ? "good" : "bad";
}

function figures(summary: ReportSummary): Figure[] {
  const now = summary.totals;
  const before = summary.previous;
  const finished = now.delivered + now.failed;
  return [
    { label: "Booked", value: formatCount(now.created), icon: PackagePlus, delta: delta(now.created, before.created, "neither", "percent") },
    { label: "Delivered", value: formatCount(now.delivered), icon: CircleCheck, delta: delta(now.delivered, before.delivered, "up", "percent") },
    { label: "Failed", value: formatCount(now.failed), icon: CircleX, delta: delta(now.failed, before.failed, "down", "percent") },
    {
      label: "Success rate",
      value: finished === 0 ? "No data" : formatPercent(now.successRate),
      icon: Gauge,
      delta: delta(now.successRate, before.successRate, "up", "points"),
    },
  ];
}

const TONE_CLASS = { good: "text-success", bad: "text-error", neutral: "text-grey-600" } as const;
const DIRECTION_ICON = { up: ArrowUpRight, down: ArrowDownRight, same: Minus } as const;

/**
 * The four headline figures for the range, each with its change against the previous period of the same length.
 * The change says its direction in words and with an arrow, so colour is never the only signal.
 */
export function ReportFigures({ summary, previousLabel }: { summary: ReportSummary | null; previousLabel: string }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summary
        ? figures(summary).map(({ label, value, icon: Icon, delta: change }) => {
            const Arrow = DIRECTION_ICON[change.direction];
            return (
              <div key={label} className="flex flex-col gap-3 rounded-lg border border-grey-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-label text-grey-700">{label}</dt>
                  <Icon className="size-5 text-grey-500" aria-hidden="true" />
                </div>
                <dd className="flex flex-col gap-1">
                  <span className="text-display text-grey-900">{value}</span>
                  <span className="flex items-center gap-1 text-body-sm">
                    <Arrow className={cn("size-4 shrink-0", TONE_CLASS[change.tone])} aria-hidden="true" />
                    <span className={TONE_CLASS[change.tone]}>
                      {change.direction === "up" && change.text !== "New this period" ? "Up " : null}
                      {change.direction === "down" ? "Down " : null}
                      {change.text}
                    </span>
                    <span className="text-grey-600">vs {previousLabel}</span>
                  </span>
                </dd>
              </div>
            );
          })
        : [0, 1, 2, 3].map((index) => (
            <div key={index} className="flex flex-col gap-3 rounded-lg border border-grey-200 bg-white p-4" aria-hidden="true">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
    </dl>
  );
}
