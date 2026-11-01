import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  name: string;
  legend: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  describedBy?: string;
  className?: string;
}

/**
 * Segmented switch (DESIGN.md §8): grey-50 track, selected item white with an orange-600 border.
 * Built from native radio buttons, so arrow keys and screen readers work as expected.
 */
export function SegmentedControl<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  describedBy,
  className,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className={cn("flex flex-col gap-2", className)} aria-describedby={describedBy}>
      <legend className="mb-2 text-label text-grey-900">{legend}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-md border border-grey-200 bg-grey-50 p-1">
        {options.map((option) => {
          const Icon = option.icon;
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent px-3 text-label text-grey-700 transition-colors hover:text-grey-900",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-600",
                checked && "border-orange-600 bg-white font-semibold text-grey-900",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {Icon && (
                <Icon
                  className={cn("size-5", checked ? "text-orange-600" : "text-grey-600")}
                  aria-hidden="true"
                />
              )}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
