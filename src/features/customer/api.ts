import { apiFetch, isApiError } from "@/lib/api";
import type {
  CustomerAddressSummary,
  CustomerProfileResponse,
  UpdatePersonalDetailsRequest,
  UpdatePreferencesRequest,
} from "./types";

export const DEMO_CUSTOMER_ADDRESSES: CustomerAddressSummary[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    label: "Home",
    addressLine1: "24 Temple Road",
    city: "Nugegoda",
    district: "COLOMBO",
    postalCode: "10250",
    isDefault: true,
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    label: "Work",
    addressLine1: "Level 4, Orion City",
    city: "Colombo 09",
    district: "COLOMBO",
    postalCode: "00900",
    isDefault: false,
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    label: "Warehouse",
    addressLine1: "12 Galle Road",
    city: "Dehiwala",
    district: "COLOMBO",
    postalCode: "10350",
    isDefault: false,
  },
];

export const customerApi = {
  /**
   * GET /customer/profile
   * Returns customer profile, statistics, and delivery preferences from backend.
   */
  getProfile(signal?: AbortSignal): Promise<CustomerProfileResponse> {
    return apiFetch<CustomerProfileResponse>("/customer/profile", { signal });
  },

  /**
   * PATCH /customer/profile/personal-details
   * Updates full name and mobile number.
   */
  updatePersonalDetails(body: UpdatePersonalDetailsRequest): Promise<CustomerProfileResponse> {
    return apiFetch<CustomerProfileResponse>("/customer/profile/personal-details", {
      method: "PATCH",
      body,
    });
  },

  /**
   * PATCH /customer/profile/preferences
   * Updates default pickup address and preferred payment method.
   */
  updatePreferences(body: UpdatePreferencesRequest): Promise<CustomerProfileResponse> {
    return apiFetch<CustomerProfileResponse>("/customer/profile/preferences", {
      method: "PATCH",
      body,
    });
  },

  /**
   * GET /customer/addresses
   * Returns saved pickup and delivery addresses for the customer.
   * If not yet implemented in backend, falls back gracefully.
   */
  async getAddresses(signal?: AbortSignal): Promise<CustomerAddressSummary[]> {
    try {
      return await apiFetch<CustomerAddressSummary[]>("/customer/addresses", { signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (isApiError(error) && (error.status === 404 || error.code === "NETWORK_ERROR")) {
        return DEMO_CUSTOMER_ADDRESSES;
      }
      return DEMO_CUSTOMER_ADDRESSES;
    }
  },
};
