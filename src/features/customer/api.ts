import { apiFetch, isApiError } from "@/lib/api";
import type {
  CustomerAddressSummary,
  CustomerProfile,
  UpdateCustomerPreferencesRequest,
  UpdateCustomerProfileRequest,
} from "./types";

export const DEMO_CUSTOMER_ADDRESSES: CustomerAddressSummary[] = [
  {
    id: "addr-1",
    label: "Home",
    addressLine1: "24 Temple Road",
    city: "Nugegoda",
    district: "COLOMBO",
    postalCode: "10250",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Work",
    addressLine1: "Level 4, Orion City",
    city: "Colombo 09",
    district: "COLOMBO",
    postalCode: "00900",
    isDefault: false,
  },
  {
    id: "addr-3",
    label: "Warehouse",
    addressLine1: "12 Galle Road",
    city: "Dehiwala",
    district: "COLOMBO",
    postalCode: "10350",
    isDefault: false,
  },
];

export const DEMO_CUSTOMER_PROFILE: CustomerProfile = {
  id: "cust-demo-1",
  fullName: "Nimali Perera",
  email: "nimali.perera@example.com",
  phone: "+94771234567",
  customerSince: "2026-10-01T08:00:00Z",
  deliveryCount: 4,
  savedAddressCount: 3,
  preferences: {
    defaultPickupAddressId: "addr-1",
    preferredPaymentMethod: "CASH_ON_DELIVERY",
  },
};

let currentProfileState = { ...DEMO_CUSTOMER_PROFILE };

export const customerApi = {
  /**
   * Fetches the customer profile and statistics.
   * If the backend endpoint is not yet available, falls back to the design mockup data.
   */
  async getProfile(signal?: AbortSignal): Promise<CustomerProfile> {
    try {
      const data = await apiFetch<CustomerProfile>("/customer/profile", { signal });
      currentProfileState = { ...data };
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      // If 404 (endpoint not yet created on backend) or network error, provide fallback
      if (isApiError(error) && error.status === 404) {
        return currentProfileState;
      }
      if (isApiError(error) && error.code === "NETWORK_ERROR") {
        return currentProfileState;
      }
      throw error;
    }
  },

  /**
   * Updates customer personal details (full name and mobile number).
   */
  async updateProfile(body: UpdateCustomerProfileRequest): Promise<CustomerProfile> {
    try {
      const updated = await apiFetch<CustomerProfile>("/customer/profile", {
        method: "PATCH",
        body,
      });
      currentProfileState = { ...updated };
      return updated;
    } catch (error) {
      if (isApiError(error) && (error.status === 404 || error.code === "NETWORK_ERROR")) {
        currentProfileState = {
          ...currentProfileState,
          fullName: body.fullName,
          phone: body.phone,
        };
        return currentProfileState;
      }
      throw error;
    }
  },

  /**
   * Fetches saved pickup and delivery addresses for the customer.
   */
  async getAddresses(signal?: AbortSignal): Promise<CustomerAddressSummary[]> {
    try {
      return await apiFetch<CustomerAddressSummary[]>("/customer/addresses", { signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (isApiError(error) && (error.status === 404 || error.code === "NETWORK_ERROR")) {
        return DEMO_CUSTOMER_ADDRESSES;
      }
      throw error;
    }
  },

  /**
   * Updates customer delivery preferences (default pickup address & payment method).
   */
  async updatePreferences(body: UpdateCustomerPreferencesRequest): Promise<CustomerProfile> {
    try {
      const updated = await apiFetch<CustomerProfile>("/customer/preferences", {
        method: "PATCH",
        body,
      });
      currentProfileState = { ...updated };
      return updated;
    } catch (error) {
      if (isApiError(error) && (error.status === 404 || error.code === "NETWORK_ERROR")) {
        currentProfileState = {
          ...currentProfileState,
          preferences: {
            defaultPickupAddressId: body.defaultPickupAddressId,
            preferredPaymentMethod: body.preferredPaymentMethod,
          },
        };
        return currentProfileState;
      }
      throw error;
    }
  },
};
