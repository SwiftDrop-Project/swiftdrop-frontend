import type { DistrictCode } from "./meta";
import type { ParcelsPerMonth } from "./merchant";

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

/**
 * The `?error=` the backend adds to FRONTEND_URL/login when "Continue with Google" fails
 * (API.md "Google sign-in").
 */
export type GoogleSignInError =
  | "google_failed"
  | "account_pending_approval"
  | "account_rejected"
  | "account_disabled";
