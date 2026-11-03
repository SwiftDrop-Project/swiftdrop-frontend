import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Data table. Put it inside a Card. Below md, show the rows as a list of cards instead when the
 * table has more than three columns (see MerchantApprovals).
 * Body states: rows, <TableLoading> while fetching, <TableEmpty> when there is nothing to show.
 */

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-body-sm text-grey-900", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-grey-50 [&_tr]:border-b [&_tr]:border-grey-200", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr data-slot="table-row" className={cn("border-b border-grey-100", className)} {...props} />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-4 text-left align-middle text-caption whitespace-nowrap text-grey-600 uppercase",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("px-4 py-3 align-top", className)} {...props} />;
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-body-sm text-grey-600", className)}
      {...props}
    />
  );
}

/** Skeleton rows shown while the data loads. */
function TableLoading({
  columns,
  rows = 3,
  label = "Loading",
}: {
  columns: number;
  rows?: number;
  /** Read by screen readers, e.g. "Loading deliveries". */
  label?: string;
}) {
  return (
    <>
      <TableRow className="sr-only">
        <TableCell colSpan={columns} role="status">
          {label}
        </TableCell>
      </TableRow>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row} aria-hidden="true">
          {Array.from({ length: columns }, (_, column) => (
            <TableCell key={column} className="py-4">
              <Skeleton className={cn("h-4", column === 0 ? "w-32" : "w-20")} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** One full-width row with an empty state, for when the list has nothing to show. */
function TableEmpty({
  columns,
  icon,
  title,
  description,
  action,
}: {
  columns: number;
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** One primary Button, if there is something useful to do. */
  action?: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={columns} className="p-6 sm:p-10">
        {/* Stays in view on phones, where a wide table scrolls sideways. */}
        <div className="sticky left-0 max-w-72 sm:max-w-none">
          <EmptyState icon={icon} title={title} description={description} actions={action} headingLevel="h3" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableLoading,
  TableEmpty,
};
