/** Error codes from API.md. NETWORK_ERROR is frontend-only (the request never reached the API). */
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "ACCOUNT_PENDING_APPROVAL"
  | "ACCOUNT_REJECTED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_REMOVED"
  | "PROFILE_INCOMPLETE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "COURIER_NOT_ASSIGNABLE"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_CODE"
  | "CODE_EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "TOO_MANY_REQUESTS"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "EMAIL_ALREADY_REGISTERED"
  | "PHONE_ALREADY_REGISTERED"
  | "PROFILE_ALREADY_COMPLETE"
  | "PARCEL_NEEDS_MANUAL_QUOTE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

/** Body of every non-2xx response. `fieldErrors` only comes with VALIDATION_FAILED. */
export interface ApiErrorBody {
  status: number;
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
  /** Frontend-only: seconds from the Retry-After header of a 429 TOO_MANY_REQUESTS, when the API sent one. */
  retryAfterSeconds?: number;
}
