import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SummaryRow {
  label: string;
  value: string;
  /** Numbers, dates, phones and tracking numbers line up with tabular figures. */
  tabular?: boolean;
}

/** A card of label / value pairs, two columns from sm up (the review step and the delivery details). */
export function SummaryCard({ title, rows }: { title: string; rows: SummaryRow[] }) {
  const titleId = React.useId();
  return (
    <Card aria-labelledby={titleId}>
      <CardHeader title={title} titleId={titleId} />
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex min-w-0 flex-col gap-1">
              <dt className="text-label text-grey-600">{row.label}</dt>
              <dd className={cn("text-body wrap-break-word text-grey-900", row.tabular && "tabular-nums")}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
