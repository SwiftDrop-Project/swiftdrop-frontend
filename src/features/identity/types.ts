import type { DistrictCode, ParcelsPerMonth, Role } from "@/types";

/* Types matching the identity DTOs in API.md (User, auth requests). */

/**
 * PENDING_EMAIL_VERIFICATION: signed up with a password and must still enter the emailed 6-digit code.
 * PROFILE_INCOMPLETE: signed up with Google and must still call POST /auth/complete-profile.
 */
export type UserStatus =
  | "ACTIVE"
  | "PENDING_EMAIL_VERIFICATION"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "DISABLED"
  | "PROFILE_INCOMPLETE";

/** A merchant's approval. Part of the User response, so it lives here; merchants imports it. */
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

export interface LoginRequest {
  /** Email, or a mobile number in any accepted format. */
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface CustomerRegisterRequest {
  accountType: "CUSTOMER";
  fullName: string;
  phone: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export interface MerchantRegisterRequest {
  accountType: "MERCHANT";
  businessName: string;
  businessRegNo?: string | null;
  parcelsPerMonth: ParcelsPerMonth;
  contactPerson: string;
  phone: string;
  email: string;
  pickupDistrict: DistrictCode;
  city: string;
  password: string;
  acceptTerms: boolean;
}

export type RegisterRequest = CustomerRegisterRequest | MerchantRegisterRequest;

/** POST /auth/complete-profile, after a Google sign-up. Like register, without email and password. */
export interface CustomerCompleteProfileRequest {
  accountType: "CUSTOMER";
  phone: string;
  acceptTerms: boolean;
}

export interface MerchantCompleteProfileRequest {
  accountType: "MERCHANT";
  businessName: string;
  businessRegNo?: string | null;
  parcelsPerMonth: ParcelsPerMonth;
  contactPerson: string;
  phone: string;
  pickupDistrict: DistrictCode;
  city: string;
  acceptTerms: boolean;
}

export type CompleteProfileRequest = CustomerCompleteProfileRequest | MerchantCompleteProfileRequest;

/** 202 answers of resend and forgot password: shown as-is. */
export interface MessageResponse {
  message: string;
}

/** POST /auth/email-verification/verify */
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

/** POST /auth/password/reset. `identifier`: email or mobile number of the account. */
export interface ResetPasswordRequest {
  identifier: string;
  code: string;
  newPassword: string;
}

/** POST /auth/password/change (logged in). */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * The `?error=` the backend adds to FRONTEND_URL/login when "Continue with Google" fails
 * (API.md "Google sign-in").
 */
export type GoogleSignInError =
  | "google_failed"
  | "account_pending_approval"
  | "account_rejected"
  | "account_disabled";
