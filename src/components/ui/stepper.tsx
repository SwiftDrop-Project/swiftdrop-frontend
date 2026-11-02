import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  /** 0-based index of the step the user is on. Use steps.length when every step is done. */
  current: number;
  className?: string;
}

/**
 * Progress through a form split into steps (Pickup → Recipient → Parcel → Review).
 * Done: orange-600 circle with a tick · current: orange-600 border · next: grey-300 border.
 * Vertical on phones, horizontal from sm up.
 */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0", className)}>
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "current" : "next";
        return (
          <li
            key={step.label}
            aria-current={state === "current" ? "step" : undefined}
            className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-2"
          >
            <div className="flex items-center sm:w-full">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-caption tabular-nums",
                  state === "done" && "border-orange-600 bg-orange-600 text-white",
                  state === "current" && "border-orange-600 bg-white font-semibold text-grey-900",
                  state === "next" && "border-grey-300 bg-white text-grey-600",
                )}
              >
                {state === "done" ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : index + 1}
              </span>
              {index < steps.length - 1 ? (
                <span aria-hidden="true" className="mx-2 hidden h-px flex-1 bg-grey-200 sm:block" />
              ) : null}
            </div>
            <div className="flex flex-col sm:pr-4">
              <span className={cn("text-label", state === "next" ? "text-grey-600" : "text-grey-900")}>
                {step.label}
                {state === "done" ? <span className="sr-only"> (done)</span> : null}
              </span>
              {step.description ? <span className="text-body-sm text-grey-600">{step.description}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
