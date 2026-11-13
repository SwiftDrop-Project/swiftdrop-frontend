import { isApiError } from "@/lib/api";

/*
 * How the courier screens react to a failed call (API.md "Courier", "Checks, in this order"):
 * - validation:   400 VALIDATION_FAILED on a form → field errors (fieldErrors), message as a summary
 * - not-found:    404 NOT_FOUND (not your task or parcel), or a 400 when loading by an id from the URL
 * - closed:       409 ASSIGNMENT_CLOSED: the task was completed or cancelled → reload, nothing more to do
 * - stale:        409 TASK_STEP_NOT_ALLOWED, ASSIGNMENT_CHANGED, INVALID_STATUS_TRANSITION: the task or the parcel
 *                 changed since it was loaded (another device, the dispatcher, a double tap) → reload and look again
 * - not-finished: 409 ASSIGNMENT_NOT_FINISHED: completing while a parcel is still open → reload
 * - other:        anything else (network, 401, 403, 429, 500, an answer that doesn't match the contract)
 * Nothing was saved in any of these cases: the backend writes the parcel and the task together or not at all.
 */
export type CourierErrorKind = "validation" | "not-found" | "closed" | "stale" | "not-finished" | "other";

export interface CourierError {
  kind: CourierErrorKind;
  /** The API's message (plain words for the courier), or our own for errors without one. */
  message: string;
  /** Per field, only for "validation". */
  fieldErrors: Record<string, string>;
  /** The task or parcel on screen is out of date: load it again. */
  reload: boolean;
}

export const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

export const COURIER_ERROR_TITLE: Record<CourierErrorKind, string> = {
  validation: "Check the details",
  "not-found": "We couldn't find this",
  closed: "This task is closed",
  stale: "This task has changed",
  "not-finished": "Some parcels still need an update",
  other: "We couldn't do that",
};

/**
 * Thrown by api.ts when an answer doesn't have the shape of the courier contract (a backend and frontend out of step).
 * `issues` says which fields; it never holds the values, so no personal data ends up in logs.
 */
export class CourierResponseError extends Error {
  readonly endpoint: string;
  readonly issues: { path: string; message: string }[];

  constructor(endpoint: string, issues: { path: string; message: string }[]) {
    super(`Unexpected response from ${endpoint}`);
    this.name = "CourierResponseError";
    this.endpoint = endpoint;
    this.issues = issues;
  }
}

/**
 * `loadingById`: the call loaded a task or parcel by an id from the URL, so a 400 can only mean that id is not a
 * UUID. That reads the same as a task or parcel that isn't yours.
 */
export function describeCourierError(error: unknown, { loadingById = false } = {}): CourierError {
  const result = (kind: CourierErrorKind, message: string, fieldErrors: Record<string, string> = {}): CourierError => ({
    kind,
    message,
    fieldErrors,
    reload: kind === "closed" || kind === "stale" || kind === "not-finished",
  });

  if (!isApiError(error)) return result("other", UNKNOWN_ERROR);
  switch (error.code) {
    case "VALIDATION_FAILED":
      return loadingById ? result("not-found", error.message) : result("validation", error.message, error.fieldErrors);
    case "NOT_FOUND":
      return result("not-found", error.message);
    case "ASSIGNMENT_CLOSED":
      return result("closed", error.message);
    case "TASK_STEP_NOT_ALLOWED":
    case "ASSIGNMENT_CHANGED":
    case "INVALID_STATUS_TRANSITION":
      return result("stale", error.message);
    case "ASSIGNMENT_NOT_FINISHED":
      return result("not-finished", error.message);
    default:
      return result("other", error.message || UNKNOWN_ERROR);
  }
}
