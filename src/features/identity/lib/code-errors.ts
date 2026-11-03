import { isApiError, retryMessage } from "@/lib/api";

export interface CodeErrorNotice {
  title: string;
  body: string;
  /** The code can't be used any more: the screen should point at "Resend code". */
  needsNewCode: boolean;
}

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/**
 * What to show when a 6-digit code is refused (verify email, reset password). Messages follow the API.md
 * error table; the expired and too-many cases point to the resend link below the boxes.
 */
export function codeErrorNotice(error: unknown): CodeErrorNotice {
  if (!isApiError(error)) {
    return { title: "We couldn't check the code", body: UNKNOWN_ERROR, needsNewCode: false };
  }
  switch (error.code) {
    case "INVALID_CODE":
      return {
        title: "That code isn't right",
        body: "Check the code in the email and try again.",
        needsNewCode: false,
      };
    case "CODE_EXPIRED":
      return {
        title: "This code has expired",
        body: "Codes work for 10 minutes. Send a new code below.",
        needsNewCode: true,
      };
    case "TOO_MANY_ATTEMPTS":
      return {
        title: "Too many wrong codes",
        body: "This code no longer works. Send a new code below.",
        needsNewCode: true,
      };
    case "TOO_MANY_REQUESTS":
      return { title: "Too many attempts", body: retryMessage(error), needsNewCode: false };
    default:
      return { title: "We couldn't check the code", body: error.message, needsNewCode: false };
  }
}
