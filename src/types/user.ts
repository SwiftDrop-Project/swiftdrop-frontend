import type { DistrictCode } from "./meta";

export type Role = "CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN";

/** PROFILE_INCOMPLETE: signed up with Google and must still call POST /auth/complete-profile. */
export type UserStatus = "ACTIVE" | "PENDING_APPROVAL" | "REJECTED" | "DISABLED" | "PROFILE_INCOMPLETE";

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
  /** Null only while status is PROFILE_INCOMPLETE. */
  phone: string | null;
  role: Role;
  status: UserStatus;
  /** Only for role MERCHANT, otherwise null. */
  merchant: MerchantInfo | null;
}
