import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  /** 0-based, as in the API's PageResponse. */
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  /** Use one of these: a callback for client-side lists, or hrefs (e.g. `?page=3`) for URL-driven lists. */
  onPageChange?: (page: number) => void;
  getHref?: (page: number) => string;
  /** "deliveries" → "Showing 1–20 of 134 deliveries". */
  itemLabel?: string;
  className?: string;
}

/** Page numbers to show: always the first and last, the current one and its neighbours. */
function pageItems(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([0, totalPages - 1, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) items.push("gap");
    items.push(p);
  });
  return items;
}

/**
 * Pager for a list (put it under the table, inside the Card). Shows the range, Previous / Next and,
 * from sm up, page numbers. The current page uses the selected style (orange-600 border).
 */
export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
  getHref,
  itemLabel,
  className,
}: PaginationProps) {
  if (totalElements === 0) return null;

  const from = page * size + 1;
  const to = Math.min(totalElements, (page + 1) * size);
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;

  function control(target: number, children: React.ReactNode, props: { label?: string; current?: boolean; disabled?: boolean; className?: string }) {
    const { label, current, disabled, className: extra } = props;
    const classes = cn(
      current && "border-orange-600 font-semibold text-grey-900 hover:bg-white",
      extra,
    );
    if (getHref && !disabled) {
      return (
        <Button asChild variant="secondary" className={classes}>
          <Link href={getHref(target)} aria-label={label} aria-current={current ? "page" : undefined}>
            {children}
          </Link>
        </Button>
      );
    }
    return (
      <Button
        variant="secondary"
        className={classes}
        disabled={disabled}
        aria-label={label}
        aria-current={current ? "page" : undefined}
        // Only set when there is a callback, so server components can use getHref.
        onClick={onPageChange ? () => onPageChange(target) : undefined}
      >
        {children}
      </Button>
    );
  }

  return (
    <nav
      aria-label="Pages"
      className={cn(
        "flex flex-col gap-3 border-t border-grey-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className,
      )}
    >
      <p className="text-body-sm text-grey-600 tabular-nums">
        Showing {from}–{to} of {totalElements}
        {itemLabel ? ` ${itemLabel}` : null}
      </p>

      <div className="flex items-center gap-2">
        {control(page - 1, <><ChevronLeft aria-hidden="true" />Previous</>, { disabled: isFirst, className: "pl-3" })}

        <span className="text-label text-grey-700 tabular-nums sm:hidden">
          Page {page + 1} of {totalPages}
        </span>

        <ul className="hidden items-center gap-1 sm:flex">
          {pageItems(page, totalPages).map((item, index) =>
            item === "gap" ? (
              <li key={`gap-${index}`} aria-hidden="true" className="w-6 text-center text-grey-500">
                …
              </li>
            ) : (
              <li key={item}>
                {control(item, item + 1, {
                  label: `Page ${item + 1}`,
                  current: item === page,
                  className: "w-10 px-0 tabular-nums",
                })}
              </li>
            ),
          )}
        </ul>

        {control(page + 1, <>Next<ChevronRight aria-hidden="true" /></>, { disabled: isLast, className: "pr-3" })}
      </div>
    </nav>
  );
}
