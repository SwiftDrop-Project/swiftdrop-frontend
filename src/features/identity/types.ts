import type { DistrictCode, ParcelsPerMonth, Role, VehicleType } from "@/types";

/* Types matching the identity DTOs in API.md (User, auth requests, admin staff management). */

/**
 * PENDING_EMAIL_VERIFICATION: signed up with a password and must still enter the emailed 6-digit code.
 * PROFILE_INCOMPLETE: signed up with Google and must still call POST /auth/complete-profile.
 * REMOVED: soft-deleted internal staff account (history preserved, login permanently blocked).
 */
export type UserStatus =
  | "ACTIVE"
  | "PENDING_EMAIL_VERIFICATION"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "DISABLED"
  | "PROFILE_INCOMPLETE"
  | "REMOVED";

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
  /** True when an admin created or reset this account's password and it must be changed before continuing. */
  mustChangePassword: boolean;
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

/* Admin staff management DTOs (/admin/couriers, /admin/dispatchers). */

export interface CourierDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  branch: DistrictCode | null;
  vehicleType: VehicleType | null;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCourierRequest {
  fullName: string;
  phone: string;
  email: string;
  branch: DistrictCode;
  vehicleType: VehicleType;
  password: string;
}

export interface UpdateCourierRequest {
  fullName: string;
  phone: string;
  email: string;
  branch: DistrictCode;
  vehicleType: VehicleType;
}

export interface AdminResetPasswordRequest {
  newPassword: string;
}

export interface CourierListParams {
  q?: string;
  branch?: DistrictCode;
  status?: UserStatus;
  page?: number;
  size?: number;
}

export interface DispatcherDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  branch: DistrictCode | null;
  status: UserStatus;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDispatcherRequest {
  fullName: string;
  phone: string;
  branch: DistrictCode;
  email: string;
  password: string;
}

export interface DispatcherListParams {
  q?: string;
  branch?: DistrictCode;
  page?: number;
  size?: number;
}

/* Admin user management DTOs (/admin/users, API.md "Users (admin)"). */

/** The `status` filter of GET /admin/users: account statuses grouped the way the page shows them. */
export type UserStatusFilter = "ACTIVE" | "BLOCKED" | "PENDING" | "REJECTED" | "REMOVED";

/** The `sort` parameter of GET /admin/users. */
export type UserSort = "NEWEST" | "OLDEST" | "NAME";

/** One row of GET /admin/users. `phone` is null only while a Google sign-up is not finished. */
export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

/** GET /admin/users/{id}. `branch` for couriers and dispatchers, `vehicleType` for couriers, `merchant` for merchants. */
export interface AdminUserDetail extends AdminUser {
  mustChangePassword: boolean;
  googleLinked: boolean;
  branch: DistrictCode | null;
  vehicleType: VehicleType | null;
  merchant: {
    businessName: string;
    pickupDistrict: DistrictCode;
    city: string;
    approvalStatus: ApprovalStatus;
  } | null;
  updatedAt: string;
  deletedAt: string | null;
}

/** GET /admin/users/stats. Removed accounts are never counted. */
export interface UserStats {
  total: number;
  active: number;
  blocked: number;
  pending: number;
  newLast30Days: number;
}

export interface UserListParams {
  q?: string;
  role?: Role;
  status?: UserStatusFilter;
  /** "2026-11-01", Sri Lanka days, both included. */
  registeredFrom?: string;
  registeredTo?: string;
  sort?: UserSort;
  page?: number;
  size?: number;
}

/** PUT /admin/users/{id} */
export interface UpdateUserRequest {
  fullName: string;
  phone: string;
  email: string;
}
