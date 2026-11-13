import { apiFetch, backendOrigin } from "@/lib/api";
import type { PageResponse } from "@/types";
import type {
  AdminResetPasswordRequest,
  ChangePasswordRequest,
  CompleteProfileRequest,
  CourierDetail,
  CourierListParams,
  CreateCourierRequest,
  CreateDispatcherRequest,
  DispatcherDetail,
  DispatcherListParams,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateCourierRequest,
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

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Admin staff management endpoints (/admin/couriers, /admin/dispatchers). */
export const staffApi = {
  listCouriers(params: CourierListParams = {}, signal?: AbortSignal) {
    const query = buildQuery({
      q: params.q?.trim() || undefined,
      branch: params.branch || undefined,
      status: params.status || undefined,
      page: params.page ?? 0,
      size: params.size ?? 20,
    });
    return apiFetch<PageResponse<CourierDetail>>(`/admin/couriers${query}`, { signal });
  },

  getCourier(id: string, signal?: AbortSignal) {
    return apiFetch<CourierDetail>(`/admin/couriers/${encodeURIComponent(id)}`, { signal });
  },

  createCourier(body: CreateCourierRequest) {
    return apiFetch<CourierDetail>("/admin/couriers", { method: "POST", body });
  },

  updateCourier(id: string, body: UpdateCourierRequest) {
    return apiFetch<CourierDetail>(`/admin/couriers/${encodeURIComponent(id)}`, { method: "PUT", body });
  },

  blockCourier(id: string) {
    return apiFetch<CourierDetail>(`/admin/couriers/${encodeURIComponent(id)}/block`, { method: "POST" });
  },

  unblockCourier(id: string) {
    return apiFetch<CourierDetail>(`/admin/couriers/${encodeURIComponent(id)}/unblock`, { method: "POST" });
  },

  removeCourier(id: string) {
    return apiFetch<CourierDetail>(`/admin/couriers/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  resetCourierPassword(id: string, body: AdminResetPasswordRequest) {
    return apiFetch<CourierDetail>(`/admin/couriers/${encodeURIComponent(id)}/reset-password`, {
      method: "POST",
      body,
    });
  },

  listDispatchers(params: DispatcherListParams = {}, signal?: AbortSignal) {
    const query = buildQuery({
      q: params.q?.trim() || undefined,
      branch: params.branch || undefined,
      page: params.page ?? 0,
      size: params.size ?? 20,
    });
    return apiFetch<PageResponse<DispatcherDetail>>(`/admin/dispatchers${query}`, { signal });
  },

  getDispatcher(id: string, signal?: AbortSignal) {
    return apiFetch<DispatcherDetail>(`/admin/dispatchers/${encodeURIComponent(id)}`, { signal });
  },

  createDispatcher(body: CreateDispatcherRequest) {
    return apiFetch<DispatcherDetail>("/admin/dispatchers", { method: "POST", body });
  },
};
