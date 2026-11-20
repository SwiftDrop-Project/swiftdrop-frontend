import type { ApprovalStatus } from "@/features/identity";
import type { DistrictCode, ParcelsPerMonth } from "@/types";

/** Row of GET /admin/merchants. */
export interface MerchantApplication {
  userId: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  pickupDistrict: DistrictCode;
  city: string;
  parcelsPerMonth: ParcelsPerMonth;
  /** ISO timestamp of sign-up. */
  createdAt: string;
}

export type MerchantApplicationStatus = ApprovalStatus;

/* ---- API keys (GET/POST /merchant/api-keys, DELETE/POST /merchant/api-keys/{id}/rotate) ---- */

/** Row returned by GET /merchant/api-keys. `revokedAt` is null while the key is active. */
export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  revokedAt: string | null;
}

/** Returned by POST /merchant/api-keys and POST /merchant/api-keys/{id}/rotate. */
export interface CreateApiKeyResult {
  id: string;
  name: string;
  /** Raw key shown exactly once: "sd_" + 32 hex chars. */
  rawKey: string;
  createdAt: string;
}
