/** Error codes from API.md. NETWORK_ERROR is frontend-only (the request never reached the API). */
export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "ACCOUNT_PENDING_APPROVAL"
  | "ACCOUNT_REJECTED"
  | "ACCOUNT_DISABLED"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "EMAIL_ALREADY_REGISTERED"
  | "PHONE_ALREADY_REGISTERED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

/** Body of every non-2xx response. `fieldErrors` only comes with VALIDATION_FAILED. */
export interface ApiErrorBody {
  status: number;
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}
