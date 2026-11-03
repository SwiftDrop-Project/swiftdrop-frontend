"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/form-field";
import { TextLink } from "@/components/ui/text-link";

/** "I agree to the Terms of Service and Privacy Policy." The links open in a new tab so the form isn't lost. */
export function TermsCheckbox<T extends FieldValues, TContext, TOutput extends FieldValues>({
  control,
  name,
}: {
  control: Control<T, TContext, TOutput>;
  name: Path<T>;
}) {
  const id = "acceptTerms";
  const errorId = `${id}-error`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id={id}
              ref={field.ref}
              name={field.name}
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              aria-invalid={Boolean(fieldState.error)}
              aria-describedby={fieldState.error ? errorId : undefined}
              className="mt-0.5"
            />
            <label htmlFor={id} className="cursor-pointer text-body text-grey-700">
              I agree to the SwiftDrop{" "}
              <TextLink href="/terms" target="_blank" rel="noopener noreferrer" className="font-normal">
                Terms of Service
              </TextLink>{" "}
              and{" "}
              <TextLink href="/privacy" target="_blank" rel="noopener noreferrer" className="font-normal">
                Privacy Policy
              </TextLink>
              .
            </label>
          </div>
          {fieldState.error?.message ? (
            <FieldError id={errorId}>{fieldState.error.message}</FieldError>
          ) : null}
        </div>
      )}
    />
  );
}
