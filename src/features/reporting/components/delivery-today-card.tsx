import { CircleCheck, CircleX, Gauge, PackagePlus, RotateCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatCount, formatLongDay, formatPercent } from "../lib/labels";
import type { AdminOverview } from "../types";

interface Figure {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  /** Green and red only for delivery outcomes (DESIGN.md §1). */
  tone?: "success" | "error";
}

function figures(data: AdminOverview): Figure[] {
  const week = data.last7Days;
  const finished = week.delivered + week.failed;
  return [
    {
      label: "Booked today",
      value: formatCount(data.today.created),
      note: `${formatCount(week.created)} in the last 7 days`,
      icon: PackagePlus,
    },
    {
      label: "Delivered today",
      value: formatCount(data.today.delivered),
      note: `${formatCount(week.delivered)} in the last 7 days`,
      icon: CircleCheck,
      tone: "success",
    },
    {
      label: "Failed today",
      value: formatCount(data.today.failed),
      note: `${formatCount(week.failed)} in the last 7 days`,
      icon: CircleX,
      tone: "error",
    },
    {
      label: "Success rate",
      value: finished === 0 ? "No data" : formatPercent(week.successRate),
      note: finished === 0 ? "No parcel finished in the last 7 days" : "Delivered out of finished, last 7 days",
      icon: Gauge,
    },
  ];
}

const ICON_TONE = {
  success: "text-success",
  error: "text-error",
} as const;

interface DeliveryTodayCardProps {
  data: AdminOverview | null;
  loadedAt: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
}

/** Today's parcels in four figures, with a refresh button. `data` null shows placeholders. */
export function DeliveryTodayCard({ data, loadedAt, refreshing, onRefresh }: DeliveryTodayCardProps) {
  const items = data ? figures(data) : null;

  return (
    <Card aria-labelledby="overview-today-heading" aria-busy={data === null || refreshing}>
      <CardHeader
        title="Deliveries today"
        titleId="overview-today-heading"
        description={
          data ? (
            `${formatLongDay(data.today.date)} · Sri Lanka time`
          ) : (
            <Skeleton className="mt-1 h-4 w-56" />
          )
        }
        aside={
          <div className="flex items-center gap-3">
            {loadedAt ? (
              <span className="hidden text-caption text-grey-500 sm:inline">
                Updated {formatTime(loadedAt.toISOString())}
              </span>
            ) : null}
            <Button variant="secondary" onClick={onRefresh} disabled={data === null || refreshing}>
              <RotateCw className={cn(refreshing && "animate-spin")} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sr-only sm:hidden">Refresh figures</span>
            </Button>
          </div>
        }
      />
      <CardContent>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items
            ? items.map(({ label, value, note, icon: Icon, tone }) => (
                <div key={label} className="flex flex-col gap-3 rounded-lg border border-grey-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-label text-grey-700">{label}</dt>
                    <Icon className={cn("size-5", tone ? ICON_TONE[tone] : "text-grey-500")} aria-hidden="true" />
                  </div>
                  <dd className="flex flex-col gap-1">
                    <span className="text-display text-grey-900 tabular-nums">{value}</span>
                    <span className="text-body-sm text-grey-600">{note}</span>
                  </dd>
                </div>
              ))
            : [0, 1, 2, 3].map((index) => (
                <div key={index} className="flex flex-col gap-3 rounded-lg border border-grey-200 p-4" aria-hidden="true">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
        </dl>
      </CardContent>
    </Card>
  );
}
