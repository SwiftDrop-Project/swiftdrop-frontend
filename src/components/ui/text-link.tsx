import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Orange-700 text link (DESIGN.md §1). */
export function TextLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "rounded-sm font-semibold text-orange-700 underline-offset-4 hover:text-orange-800 hover:underline",
        className,
      )}
      {...props}
    />
  );
}
