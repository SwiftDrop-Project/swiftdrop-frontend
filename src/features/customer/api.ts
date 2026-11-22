import { apiFetch } from "@/lib/api";
import type {
  CustomerAddress,
  CustomerAddressRequest,
  CustomerProfileResponse,
  UpdatePersonalDetailsRequest,
  UpdatePreferencesRequest,
} from "./types";

function addressPath(id: string): string {
  return `/customer/addresses/${encodeURIComponent(id)}`;
}

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

  /** GET /customer/addresses: the saved addresses, the default pickup address first. */
  getAddresses(signal?: AbortSignal): Promise<CustomerAddress[]> {
    return apiFetch<CustomerAddress[]>("/customer/addresses", { signal });
  },

  /** POST /customer/addresses: 201 with the saved address; 409 ADDRESS_LIMIT_REACHED after 20. */
  createAddress(body: CustomerAddressRequest): Promise<CustomerAddress> {
    return apiFetch<CustomerAddress>("/customer/addresses", { method: "POST", body });
  },

  /** PUT /customer/addresses/{id}: replaces every field. 404 NOT_FOUND when it isn't the customer's. */
  updateAddress(id: string, body: CustomerAddressRequest): Promise<CustomerAddress> {
    return apiFetch<CustomerAddress>(addressPath(id), { method: "PUT", body });
  },

  /** PUT /customer/addresses/{id}/default: makes it the default pickup address. */
  makeDefaultAddress(id: string): Promise<CustomerAddress> {
    return apiFetch<CustomerAddress>(`${addressPath(id)}/default`, { method: "PUT" });
  },

  /** DELETE /customer/addresses/{id}: 204. Deleting the default leaves no default. */
  deleteAddress(id: string): Promise<void> {
    return apiFetch<void>(addressPath(id), { method: "DELETE" });
  },
};
