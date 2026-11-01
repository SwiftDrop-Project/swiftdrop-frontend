import * as React from "react";
import { cn } from "@/lib/utils";

/** Classes shared by text inputs and native selects (DESIGN.md §7). */
export const fieldControlClass = cn(
  "h-12 w-full min-w-0 rounded-md border border-grey-300 bg-white px-4 text-body text-grey-900 transition-colors outline-none",
  "placeholder:text-grey-500",
  "focus-visible:border-orange-600 focus-visible:ring-3 focus-visible:ring-orange-100",
  "disabled:cursor-not-allowed disabled:bg-grey-50 disabled:text-grey-400",
  "aria-invalid:border-error aria-invalid:focus-visible:ring-error-tint",
);

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input type={type} data-slot="input" className={cn(fieldControlClass, className)} {...props} />
  );
}

export { Input };
