import type { LoginRequest, RegisterRequest, User } from "@/types";
import { apiFetch } from "./client";

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
};
