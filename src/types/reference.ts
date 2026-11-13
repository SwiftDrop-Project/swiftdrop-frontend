/*
 * Reference data shared by several features, like the backend's shared/reference package.
 * The lists come from GET /meta/districts (lib/api/meta.ts) and lib/reference.ts.
 */

/** One of the 25 district codes, e.g. "COLOMBO". The full list comes from GET /meta/districts. */
export type DistrictCode = string;

export interface District {
  code: DistrictCode;
  name: string;
}

/** How many parcels a merchant expects to send a month (merchant sign-up). */
export type ParcelsPerMonth = "UNDER_50" | "FROM_50_TO_200" | "FROM_200_TO_1000" | "OVER_1000";

/** Vehicle types assigned to SwiftDrop couriers (matches shared.reference.VehicleType). */
export type VehicleType = "MOTORBIKE" | "THREE_WHEELER" | "VAN" | "LORRY";

export interface VehicleTypeItem {
  code: VehicleType;
  name: string;
}
