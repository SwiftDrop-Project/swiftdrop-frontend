import type { ApprovalStatus } from "@/features/identity";
import type { DeliveryContact } from "@/features/delivery";
import type { DistrictCode, ParcelsPerMonth, ParcelStatus } from "@/types";

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

/* ---- Merchant orders (GET/POST /merchant/orders) ---- */

/** Row returned by GET /merchant/orders and POST /merchant/orders. */
export interface MerchantOrder {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  /** Merchant's own reference, e.g. an order number from their own system. */
  merchantOrderRef: string | null;
  pickup: DeliveryContact;
  recipient: DeliveryContact;
  weightKg: number;
  codAmount: number | null;
  instructions: string | null;
  feeAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /merchant/orders. */
export interface CreateMerchantOrderRequest {
  pickup: DeliveryContact;
  recipient: DeliveryContact;
  weightKg: number;
  merchantOrderRef?: string;
  codAmount?: number;
  instructions?: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  keepUpright?: boolean;
}

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
