import type { User } from "@/features/identity";
import { apiFetch } from "@/lib/api";
import type { PageResponse, ParcelStatus } from "@/types";
import type {
  ApiKey,
  CreateApiKeyResult,
  CreateMerchantOrderRequest,
  MerchantApplication,
  MerchantApplicationStatus,
  MerchantOrder,
} from "./types";

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

/* Merchant order endpoints (API.md "Merchant orders", role MERCHANT only). */
export const merchantOrdersApi = {
  list(params: { page?: number; size?: number; status?: ParcelStatus }, signal?: AbortSignal) {
    return apiFetch<PageResponse<MerchantOrder>>("/merchant/orders", {
      query: { page: params.page ?? 0, size: params.size ?? 20, status: params.status },
      signal,
    });
  },

  create(request: CreateMerchantOrderRequest) {
    return apiFetch<MerchantOrder>("/merchant/orders", {
      method: "POST",
      body: request,
    });
  },
};

/* API key endpoints (API.md "Merchant API keys", role MERCHANT only). */
export const merchantApiKeysApi = {
  list(signal?: AbortSignal) {
    return apiFetch<ApiKey[]>("/merchant/api-keys", { signal });
  },

  create(name: string) {
    return apiFetch<CreateApiKeyResult>("/merchant/api-keys", {
      method: "POST",
      body: { name },
    });
  },

  revoke(id: string) {
    return apiFetch<void>(`/merchant/api-keys/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  rotate(id: string) {
    return apiFetch<CreateApiKeyResult>(`/merchant/api-keys/${encodeURIComponent(id)}/rotate`, {
      method: "POST",
    });
  },
};
