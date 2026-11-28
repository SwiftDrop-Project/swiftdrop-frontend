import type { DistrictCode } from "@/types";

/* Types matching com.swiftdrop.customer.internal.dto in swiftdrop-backend (WP2). */

export type PaymentMethod = "CASH_ON_DELIVERY" | "MOCK_CARD";

/** A saved address (GET /customer/addresses, API.md "Saved addresses"). The phone comes back as +947XXXXXXXX. */
export interface CustomerAddress {
  id: string;
  label: string;
  contactName: string;
  phone: string;
  addressLine: string;
  city: string;
  district: DistrictCode;
  /** Five digits, e.g. "10250". */
  postalCode: string;
  landmark: string | null;
  /** It is the customer's default pickup address (at most one is). */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Kept for the profile screens: a saved address is all they need. */
export type CustomerAddressSummary = CustomerAddress;

/**
 * Body of POST /customer/addresses and PUT /customer/addresses/{id}. `useAsDefault`: true makes it the default pickup
 * address; false (on an edit) stops it being the default.
 */
export interface CustomerAddressRequest {
  label: string;
  contactName: string;
  phone: string;
  addressLine: string;
  city: string;
  district: DistrictCode;
  postalCode: string;
  landmark?: string;
  useAsDefault: boolean;
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
