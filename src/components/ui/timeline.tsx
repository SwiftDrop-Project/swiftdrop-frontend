import * as React from "react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  /** What happened, e.g. "Out for delivery" (use PARCEL_STATUS_LABEL for statuses). */
  title: string;
  /** Where or by whom, e.g. "Kandy branch". */
  description?: React.ReactNode;
  /** ISO timestamp; shown in Sri Lankan time. */
  timestamp: string;
  /** success / error only for the final delivery outcome. Never orange. */
  tone?: "default" | "success" | "error";
}

const DOT_CLASS = {
  default: "bg-grey-900",
  success: "bg-success",
  error: "bg-error",
};

/** A parcel's history, newest first. The newest event has a dark dot; older ones are grey. */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((item, index) => {
        const latest = index === 0;
        const last = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? (
              <span aria-hidden="true" className="absolute top-4 bottom-0 left-1.5 w-px -translate-x-1/2 bg-grey-200" />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-1.5 size-3 shrink-0 rounded-full",
                latest ? DOT_CLASS[item.tone ?? "default"] : "bg-grey-300",
              )}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className={cn("text-label", latest ? "font-semibold text-grey-900" : "text-grey-800")}>
                {item.title}
              </p>
              {item.description ? <p className="text-body-sm text-grey-600">{item.description}</p> : null}
              <time dateTime={item.timestamp} className="text-caption font-normal text-grey-600 tabular-nums">
                {formatDateTime(item.timestamp)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
