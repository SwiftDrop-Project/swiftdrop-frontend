"use client";

import * as React from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { Notice } from "@/components/feedback/notice";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/**
 * Turns a failed POST /auth/register or /auth/complete-profile into field errors (VALIDATION_FAILED,
 * duplicate email or phone) and, for anything else, a notice above the form.
 */
export function useRegisterErrorHandler<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  title = "We couldn't create your account",
) {
  const [messages, setMessages] = React.useState<string[] | null>(null);

  const handleError = React.useCallback(
    (error: unknown) => {
      if (!isApiError(error)) {
        setMessages([UNKNOWN_ERROR]);
        return;
      }
      const { handled, unmatched } = applyServerFieldErrors(error, setError, fields);
      if (unmatched.length > 0) {
        setMessages(unmatched);
      } else if (!handled) {
        setMessages([error.message]);
      }
    },
    [setError, fields],
  );

  const clearNotice = React.useCallback(() => setMessages(null), []);

  const notice = messages ? (
    <Notice tone="error" title={title}>
      {messages.length > 1 ? (
        <ul className="list-disc pl-4">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : (
        messages[0]
      )}
    </Notice>
  ) : null;

  return { notice, clearNotice, handleError };
}
