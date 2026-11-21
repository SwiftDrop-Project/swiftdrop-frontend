import type { DistrictCode } from "@/types";

/* Types matching the customer DTOs in API.md (WP2). */

export type PaymentMethod = "CASH_ON_DELIVERY" | "MOCK_CARD";

export interface CustomerAddressSummary {
  id: string;
  label: string;
  addressLine1: string;
  city: string;
  district: DistrictCode;
  postalCode?: string | null;
  isDefault: boolean;
}

export interface CustomerPreferences {
  defaultPickupAddressId: string | null;
  preferredPaymentMethod: PaymentMethod;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  customerSince: string;
  deliveryCount: number;
  savedAddressCount: number;
  preferences: CustomerPreferences;
}

export interface UpdateCustomerProfileRequest {
  fullName: string;
  phone: string;
}

export interface UpdateCustomerPreferencesRequest {
  defaultPickupAddressId: string | null;
  preferredPaymentMethod: PaymentMethod;
}
