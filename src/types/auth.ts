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
