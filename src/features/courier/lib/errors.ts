import { isApiError } from "@/lib/api";

/*
 * How the courier screens react to a failed call (API.md "Courier"):
 * - unavailable: 503 SERVICE_UNAVAILABLE, parcels don't exist on the server yet → info notice
 * - not-found:   404, or a 400 for a bad parcel id → "We couldn't find this parcel"
 * - conflict:    409 INVALID_STATUS_TRANSITION → toast and reload
 * - validation:  400 VALIDATION_FAILED on a form → field errors
 * - other:       anything else (network, 500, 401) → error notice with the message
 */
export type CourierErrorKind = "unavailable" | "not-found" | "conflict" | "validation" | "other";

export interface CourierError {
  kind: CourierErrorKind;
  message: string;
}

export const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

export const UNAVAILABLE_TITLE = "Deliveries aren't available yet";

export const CONFLICT_TITLE = "This parcel's status has changed";

export const NOT_FOUND_TITLE = "This parcel isn't assigned to you any more";

/**
 * `loadingParcel`: the call loaded one parcel by its id, so a 400 can only mean the id in the URL
 * is not a UUID. That reads the same as a parcel that isn't yours.
 */
export function describeCourierError(error: unknown, { loadingParcel = false } = {}): CourierError {
  if (!isApiError(error)) return { kind: "other", message: UNKNOWN_ERROR };
  switch (error.code) {
    case "SERVICE_UNAVAILABLE":
      return { kind: "unavailable", message: error.message };
    case "NOT_FOUND":
      return { kind: "not-found", message: error.message };
    case "INVALID_STATUS_TRANSITION":
      return { kind: "conflict", message: error.message };
    case "VALIDATION_FAILED":
      return { kind: loadingParcel ? "not-found" : "validation", message: error.message };
    default:
      return { kind: "other", message: error.message || UNKNOWN_ERROR };
  }
}
