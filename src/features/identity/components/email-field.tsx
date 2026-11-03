"use client";

import * as React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { TextButton } from "@/components/ui/text-link";
import { suggestEmailFix } from "../lib/email";

interface EmailFieldProps {
  registration: UseFormRegisterReturn;
  error?: string;
  label?: string;
  helper?: React.ReactNode;
  placeholder?: string;
  /** Puts the suggested address into the form (setValue with validation). */
  onUseSuggestion: (email: string) => void;
}

/**
 * Sign-up email. When the person leaves the field with a likely typo in the domain ("name@gmial.com"), a
 * one-click "Did you mean name@gmail.com?" appears below it. Server checks (unknown domain, disposable
 * address) arrive as the field error.
 */
export function EmailField({
  registration,
  error,
  label = "Email",
  helper,
  placeholder = "name@example.com",
  onUseSuggestion,
}: EmailFieldProps) {
  const [suggestion, setSuggestion] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <FormField id={registration.name} label={label} helper={helper} error={error}>
        {(a11y) => (
          <Input
            {...a11y}
            {...registration}
            onBlur={(event) => {
              setSuggestion(suggestEmailFix(event.target.value));
              return registration.onBlur(event);
            }}
            onChange={(event) => {
              // A new edit makes the old suggestion stale; it comes back on the next blur.
              if (suggestion) setSuggestion(null);
              return registration.onChange(event);
            }}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={placeholder}
          />
        )}
      </FormField>
      {suggestion ? (
        <p className="text-body-sm text-grey-700" role="status">
          Did you mean{" "}
          <TextButton
            onClick={() => {
              onUseSuggestion(suggestion);
              setSuggestion(null);
            }}
          >
            {suggestion}
          </TextButton>
          ?
        </p>
      ) : null}
    </div>
  );
}
