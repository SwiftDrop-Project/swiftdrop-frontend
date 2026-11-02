import * as React from "react";
import { fieldControlBase } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Multi-line text, e.g. delivery instructions. Same border, focus and error styles as Input. */
export function Textarea({ className, rows = 4, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(fieldControlBase, "min-h-24 resize-y py-3", className)}
      {...props}
    />
  );
}
