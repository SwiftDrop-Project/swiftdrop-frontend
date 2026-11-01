import type { DistrictCode } from "./meta";

export type Role = "CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN";

export type UserStatus = "ACTIVE" | "PENDING_APPROVAL" | "REJECTED" | "DISABLED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MerchantInfo {
  businessName: string;
  pickupDistrict: DistrictCode;
  city: string;
  approvalStatus: ApprovalStatus;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  /** Only for role MERCHANT, otherwise null. */
  merchant: MerchantInfo | null;
}
