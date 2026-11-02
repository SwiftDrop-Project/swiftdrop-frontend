import * as React from "react";
import { cn } from "@/lib/utils";

/** White panel with a 1px border and lg radius, no shadow (DESIGN.md §5). Add padding with a class. */
export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-lg border border-grey-200 bg-white", className)} {...props} />;
}

/** Title row of a card that holds a list or table: Heading 3 on the left, a count or action on the right. */
export function CardHeader({
  title,
  titleId,
  description,
  aside,
  className,
}: {
  title: React.ReactNode;
  /** Pass it to the Card's aria-labelledby. */
  titleId?: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-grey-200 px-4 py-4 sm:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={titleId} className="text-h3 text-grey-900">
          {title}
        </h2>
        {description ? <p className="text-body-sm text-grey-600">{description}</p> : null}
      </div>
      {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
    </div>
  );
}

/** Padded body of a card. */
export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4 sm:p-6", className)} {...props} />;
}
