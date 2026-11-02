import { apiFetch, backendOrigin } from "@/lib/api";
import type { CompleteProfileRequest, LoginRequest, RegisterRequest, User } from "./types";

/* Identity endpoints (API.md "Endpoints"): register, log in, log out, current user, Google sign-in. */

export const authApi = {
  /** Customer: logged in straight away (cookie set). Merchant: PENDING_APPROVAL, no cookie. */
  register(body: RegisterRequest) {
    return apiFetch<User>("/auth/register", { method: "POST", body });
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
