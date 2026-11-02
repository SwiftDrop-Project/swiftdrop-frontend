import type { User } from "@/features/identity";
import { apiFetch } from "@/lib/api";
import type { MerchantApplication, MerchantApplicationStatus } from "./types";

/* Merchant approval endpoints (API.md "Admin", role ADMIN only). */
export const merchantsApi = {
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
