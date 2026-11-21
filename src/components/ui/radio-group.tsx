"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** DESIGN.md §8: Radio selection control. Checked orange-600, rounded-full. */
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-full border border-grey-400 bg-white transition-colors outline-none",
        "after:absolute after:-inset-2",
        "focus-visible:border-orange-600 focus-visible:ring-3 focus-visible:ring-orange-100",
        "disabled:cursor-not-allowed disabled:border-grey-300 disabled:bg-grey-50",
        "data-checked:border-orange-600",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span className="size-2.5 rounded-full bg-orange-600" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
