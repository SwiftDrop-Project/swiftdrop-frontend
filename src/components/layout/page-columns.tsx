import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Main column plus a 300px side column on wide screens (xl and up); stacked below that.
 * Both columns stack their cards 24px apart. Used by the customer overview and DetailPage.
 */
export function PageColumns({
  children,
  aside,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  if (!aside) {
    return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
  }
  return (
    <div className={cn("grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18.75rem]", className)}>
      <div className="flex flex-col gap-6">{children}</div>
      <div className="flex flex-col gap-6">{aside}</div>
    </div>
  );
}
