import * as React from "react";
import { ChevronDown } from "lucide-react";
import { fieldControlClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Native select with a grey-600 chevron (DESIGN.md §7). */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(fieldControlClass, "cursor-pointer appearance-none pr-12", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-grey-600"
        aria-hidden="true"
      />
    </div>
  );
}
