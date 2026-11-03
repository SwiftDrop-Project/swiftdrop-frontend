import { apiFetch, backendOrigin } from "@/lib/api";
import type {
  ChangePasswordRequest,
  CompleteProfileRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  User,
  VerifyEmailRequest,
} from "./types";

/*
 * Identity endpoints (API.md "Endpoints"): register, email verification, log in, log out, current user,
 * passwords, Google sign-in.
 */

export const authApi = {
  /**
   * Customer and merchant: status PENDING_EMAIL_VERIFICATION, no cookie. A 6-digit code is emailed;
   * then call verifyEmail.
   */
  register(body: RegisterRequest) {
    return apiFetch<User>("/auth/register", { method: "POST", body });
  },

  /**
   * Customer: ACTIVE and logged in (cookie set). Merchant: PENDING_APPROVAL, no cookie.
   * Fails with INVALID_CODE, CODE_EXPIRED or TOO_MANY_ATTEMPTS.
   */
  verifyEmail(body: VerifyEmailRequest) {
    return apiFetch<User>("/auth/email-verification/verify", { method: "POST", body });
  },

  /** Always 202, whether or not the email is registered. At most one code per 60 seconds. */
  resendVerification(email: string) {
    return apiFetch<MessageResponse>("/auth/email-verification/resend", { method: "POST", body: { email } });
  },

  login(body: LoginRequest) {
    return apiFetch<User>("/auth/login", { method: "POST", body });
  },

  /** Clears the SD_TOKEN cookie. */
  logout() {
    return apiFetch<void>("/auth/logout", { method: "POST" });
  },

  me(signal?: AbortSignal) {
    return apiFetch<User>("/auth/me", { signal });
  },

  /** Always 202 with the same message; if an account matches, its email gets a 6-digit code. */
  forgotPassword(identifier: string) {
    return apiFetch<MessageResponse>("/auth/password/forgot", { method: "POST", body: { identifier } });
  },

  /** 204. Ends every session of the account; the user then logs in with the new password. */
  resetPassword(body: ResetPasswordRequest) {
    return apiFetch<void>("/auth/password/reset", { method: "POST", body });
  },

  /** 204 with a fresh cookie for this session; the user's other sessions end. */
  changePassword(body: ChangePasswordRequest) {
    return apiFetch<void>("/auth/password/change", { method: "POST", body });
  },

  /**
   * Finishes a Google sign-up (status PROFILE_INCOMPLETE).
   * Customer: ACTIVE, fresh cookie. Merchant: PENDING_APPROVAL, cookie cleared.
   */
  completeProfile(body: CompleteProfileRequest) {
    return apiFetch<User>("/auth/complete-profile", { method: "POST", body });
  },

  /**
   * Where "Continue with Google" sends the browser (a full-page navigation, not fetch).
   * It is on the backend origin, outside /api/v1.
   */
  googleSignInUrl() {
    return `${backendOrigin()}/oauth2/authorization/google`;
  },
};
