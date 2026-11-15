import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { formatCount, formatDay } from "../lib/labels";
import type { PeriodSummary } from "../types";

/** The last 7 days, one row per day, with a bar showing how busy each day was. `week` null shows placeholders. */
export function WeeklyDeliveriesCard({ week }: { week: PeriodSummary | null }) {
  const busiest = week ? Math.max(1, ...week.perDay.map((day) => day.created)) : 1;
  const days = week ? [...week.perDay].reverse() : [];

  return (
    <Card aria-labelledby="overview-week-heading" className="flex flex-col">
      <CardHeader
        title="Last 7 days"
        titleId="overview-week-heading"
        description={
          week ? `${formatDay(week.from)} to ${formatDay(week.to)}, newest first` : <Skeleton className="mt-1 h-4 w-44" />
        }
      />
      <Table>
        <TableCaption className="sr-only">
          Parcels booked, delivered and failed on each of the last 7 days
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead className="w-2/5">Booked</TableHead>
            <TableHead className="text-right">Delivered</TableHead>
            <TableHead className="text-right">Failed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {week === null ? (
            <TableLoading columns={4} rows={7} label="Loading the last 7 days" />
          ) : (
            <>
              {days.map((day, index) => (
                <TableRow key={day.date}>
                  <TableCell className="whitespace-nowrap text-grey-700">
                    {formatDay(day.date)}
                    {index === 0 ? <span className="ml-2 text-caption text-grey-500">Today</span> : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="w-8 shrink-0 text-label tabular-nums">{formatCount(day.created)}</span>
                      <div className="h-1.5 w-full min-w-12 rounded-full bg-grey-100" aria-hidden="true">
                        <div
                          className="h-full rounded-full bg-grey-700"
                          style={{ width: `${(day.created / busiest) * 100}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(day.delivered)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(day.failed)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-grey-50">
                <TableCell className="text-label text-grey-900">Total</TableCell>
                <TableCell className="text-label tabular-nums">{formatCount(week.created)}</TableCell>
                <TableCell className="text-right text-label text-success tabular-nums">
                  {formatCount(week.delivered)}
                </TableCell>
                <TableCell className="text-right text-label text-error tabular-nums">
                  {formatCount(week.failed)}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
