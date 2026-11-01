import type { MerchantApplication, MerchantApplicationStatus, User } from "@/types";
import { apiFetch } from "./client";

export const adminApi = {
  /** Oldest application first. */
  listMerchants(status: MerchantApplicationStatus = "PENDING", signal?: AbortSignal) {
    return apiFetch<MerchantApplication[]>("/admin/merchants", { query: { status }, signal });
  },

  approveMerchant(userId: string) {
    return apiFetch<User>(`/admin/merchants/${encodeURIComponent(userId)}/approve`, {
      method: "POST",
    });
  },

  rejectMerchant(userId: string) {
    return apiFetch<User>(`/admin/merchants/${encodeURIComponent(userId)}/reject`, {
      method: "POST",
    });
  },
};
