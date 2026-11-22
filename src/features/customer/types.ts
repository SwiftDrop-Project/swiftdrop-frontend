import type { DistrictCode } from "@/types";

/* Types matching com.swiftdrop.customer.internal.dto in swiftdrop-backend (WP2). */

export type PaymentMethod = "CASH_ON_DELIVERY" | "MOCK_CARD";

export interface CustomerAddressSummary {
  id: string;
  label: string;
  addressLine1: string;
  city: string;
  district?: DistrictCode;
  postalCode?: string | null;
  isDefault?: boolean;
}

export interface CustomerProfileResponse {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  customerSince: string;
  totalDeliveries: number;
  savedAddressesCount: number;
  defaultPickupAddressId: string | null;
  preferredPaymentMethod: PaymentMethod;
}

export interface UpdatePersonalDetailsRequest {
  fullName: string;
  phone: string;
}

export interface UpdatePreferencesRequest {
  defaultPickupAddressId: string | null;
  preferredPaymentMethod: PaymentMethod;
}
