import type { District, VehicleTypeItem } from "@/types";
import { apiFetch } from "./client";

export const metaApi = {
  /** All 25 districts, sorted by name. */
  districts(signal?: AbortSignal) {
    return apiFetch<District[]>("/meta/districts", { signal });
  },

  /** Supported courier vehicle types, in enum order. */
  vehicleTypes(signal?: AbortSignal) {
    return apiFetch<VehicleTypeItem[]>("/meta/vehicle-types", { signal });
  },
};
