import type { GoogleSignInError } from "@/types";

/** Baked in at build time (see Dockerfile build args). */
export const GOOGLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true";

export type GoogleAccountType = "customer" | "merchant";

const ACCOUNT_TYPE_KEY = "swiftdrop.googleAccountType";

/*
 * The account type picked before going to Google, so /register/complete can open on the same tab.
 * sessionStorage can throw (private mode, blocked storage); the type is only a convenience, so
 * failures are ignored.
 */

export function saveGoogleAccountType(type: GoogleAccountType): void {
  try {
    sessionStorage.setItem(ACCOUNT_TYPE_KEY, type);
  } catch {
    // ignore
  }
}

/** The saved type, or "customer" when there is none. */
export function readGoogleAccountType(): GoogleAccountType {
  try {
    return sessionStorage.getItem(ACCOUNT_TYPE_KEY) === "merchant" ? "merchant" : "customer";
  } catch {
    return "customer";
  }
}

export function clearGoogleAccountType(): void {
  try {
    sessionStorage.removeItem(ACCOUNT_TYPE_KEY);
  } catch {
    // ignore
  }
}

export interface SignInErrorNotice {
  tone: "info" | "error";
  title: string;
  body: string;
}

/**
 * Notices for the backend's FRONTEND_URL/login?error=… redirects. The account messages are the
 * same as POST /auth/login returns for ACCOUNT_PENDING_APPROVAL, ACCOUNT_REJECTED and ACCOUNT_DISABLED.
 */
export const GOOGLE_SIGN_IN_ERRORS: Record<GoogleSignInError, SignInErrorNotice> = {
  google_failed: {
    tone: "error",
    title: "We couldn't sign you in with Google",
    body: "Try again, or log in with your mobile number or email.",
  },
  account_pending_approval: {
    tone: "info",
    title: "Your account is waiting for approval",
    body: "Your merchant account is waiting for approval. We'll email you when it's ready.",
  },
  account_rejected: {
    tone: "error",
    title: "Your merchant application wasn't approved",
    body: "Your merchant application was not approved.",
  },
  account_disabled: {
    tone: "error",
    title: "This account is disabled",
    body: "Your account has been disabled. Please contact support.",
  },
};

export function isGoogleSignInError(value: string | null): value is GoogleSignInError {
  return value !== null && Object.hasOwn(GOOGLE_SIGN_IN_ERRORS, value);
}
