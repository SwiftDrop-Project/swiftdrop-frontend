import * as React from "react";
import { CircleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

interface FormFieldProps {
  id: string;
  label: React.ReactNode;
  /** Shown next to the label in grey, e.g. "(optional)". */
  labelHint?: string;
  /** Shown at the right end of the label row, e.g. a "Forgot password?" link. */
  labelAside?: React.ReactNode;
  helper?: React.ReactNode;
  error?: string;
  className?: string;
  children: (control: ControlProps) => React.ReactNode;
}

/**
 * Label above, helper or error below (DESIGN.md §7).
 * The control gets the id, aria-invalid and aria-describedby it needs from the render prop.
 */
export function FormField({
  id,
  label,
  labelHint,
  labelAside,
  helper,
  error,
  className,
  children,
}: FormFieldProps) {
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id}>
          {label}
          {labelHint && <span className="font-normal text-grey-600"> {labelHint}</span>}
        </Label>
        {labelAside}
      </div>
      <div className="flex flex-col gap-1">
        {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
        {error ? <FieldError id={errorId}>{error}</FieldError> : null}
        {!error && helper ? (
          <p id={helperId} className="text-caption font-normal text-grey-600">
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1 text-body-sm text-error">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
