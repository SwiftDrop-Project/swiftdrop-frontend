import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/lib/api";

/**
 * Puts server errors under the matching form fields and focuses the first one.
 * Returns whether any field got an error, plus messages for fields the form doesn't have.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): { handled: boolean; unmatched: string[] } {
  const known = new Set<string>(fields);
  const entries: [string, string][] = Object.entries(error.fieldErrors);

  if (error.code === "EMAIL_ALREADY_REGISTERED") entries.push(["email", error.message]);
  if (error.code === "PHONE_ALREADY_REGISTERED") entries.push(["phone", error.message]);

  const unmatched: string[] = [];
  let handled = false;
  for (const [field, message] of entries) {
    if (known.has(field)) {
      setError(field as Path<T>, { type: "server", message }, { shouldFocus: !handled });
      handled = true;
    } else {
      unmatched.push(message);
    }
  }
  return { handled, unmatched };
}
