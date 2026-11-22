import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { FieldError } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  /** One line under the label, e.g. what happens when this option is chosen. */
  description?: string;
  icon?: LucideIcon;
}

interface RadioCardsProps<T extends string> {
  /** The radios' name; each option's id is "{name}-{value}". */
  name: string;
  legend: string;
  /** Shown under the legend. */
  hint?: string;
  /** null until something is chosen: there is no default choice. */
  value: T | null;
  options: readonly RadioCardOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  /** Goes on the first radio, so a form can move the focus here when nothing is chosen. */
  ref?: React.Ref<HTMLInputElement>;
  className?: string;
}

/**
 * A choice between a few options shown as cards, each with a label and a line of explanation (e.g. the payment
 * method). Like the segmented switch (DESIGN.md §8): white cards, the chosen one with an orange-600 border and an
 * orange-600 dot. One row from sm up, stacked on phones. Built from native radio buttons, so arrow keys and screen
 * readers work as expected.
 */
export function RadioCards<T extends string>({
  name,
  legend,
  hint,
  value,
  options,
  onChange,
  error,
  disabled = false,
  ref,
  className,
}: RadioCardsProps<T>) {
  const hintId = `${name}-hint`;
  const errorId = `${name}-error`;

  return (
    <fieldset disabled={disabled} className={cn("group flex min-w-0 flex-col gap-3", className)}>
      <legend className="mb-3 text-label text-grey-900">{legend}</legend>
      {hint ? (
        <p id={hintId} className="-mt-2 text-body-sm text-grey-600">
          {hint}
        </p>
      ) : null}

      <div className="grid gap-3 sm:auto-cols-fr sm:grid-flow-col">
        {options.map((option, index) => {
          const Icon = option.icon;
          const checked = option.value === value;
          const id = `${name}-${option.value}`;
          const descriptionId = option.description ? `${id}-description` : undefined;
          const describedBy = [descriptionId, error ? errorId : hint ? hintId : undefined].filter(Boolean).join(" ");

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border bg-white p-4 transition-colors",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-600",
                "group-disabled:cursor-not-allowed group-disabled:bg-grey-50",
                checked
                  ? "border-orange-600"
                  : error
                    ? "border-error"
                    : "border-grey-200 hover:border-grey-400 group-disabled:hover:border-grey-200",
              )}
            >
              <input
                ref={index === 0 ? ref : undefined}
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                aria-describedby={describedBy || undefined}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border bg-white",
                  checked ? "border-orange-600" : error ? "border-error" : "border-grey-400",
                )}
              >
                {checked ? <span className="size-2.5 rounded-full bg-orange-600" /> : null}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2 text-label text-grey-900 group-disabled:text-grey-500">
                  {Icon ? (
                    <Icon
                      aria-hidden="true"
                      className={cn("size-5 shrink-0", checked ? "text-orange-600" : "text-grey-600")}
                    />
                  ) : null}
                  {option.label}
                </span>
                {option.description ? (
                  <span id={descriptionId} className="text-body-sm text-grey-600">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  );
}
