import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Sri Lankan mobile number with a "+94" prefix segment (DESIGN.md §7).
 * The value is sent as typed: the API accepts 77…, 077… and +9477… with spaces.
 */
export function PhoneInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <div
      className={cn(
        "flex h-12 w-full overflow-hidden rounded-md border border-grey-300 bg-white transition-colors",
        "focus-within:border-orange-600 focus-within:ring-3 focus-within:ring-orange-100",
        "has-[input[aria-invalid=true]]:border-error has-[input[aria-invalid=true]]:focus-within:ring-error-tint",
        "has-[input:disabled]:bg-grey-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex items-center border-r border-grey-300 bg-grey-50 px-4 text-body text-grey-800 tabular-nums"
      >
        +94
      </span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className="h-full min-w-0 flex-1 bg-transparent px-4 text-body text-grey-900 tabular-nums outline-none placeholder:text-grey-500 disabled:cursor-not-allowed disabled:text-grey-400"
        {...props}
      />
    </div>
  );
}
