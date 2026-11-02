import * as React from "react";
import { ChevronDown } from "lucide-react";
import { fieldControlVariants, type ControlSize } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  /** 48px by default; "md" is 40px. */
  size?: ControlSize;
};

/**
 * Native select with a grey-600 chevron (DESIGN.md §7). Put the options inside as <option>;
 * start with `<option value="" disabled>Select a …</option>` when nothing is chosen yet.
 */
export function Select({ className, children, size, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(fieldControlVariants({ size }), "cursor-pointer appearance-none pr-12", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-grey-600"
        aria-hidden="true"
      />
    </div>
  );
}
