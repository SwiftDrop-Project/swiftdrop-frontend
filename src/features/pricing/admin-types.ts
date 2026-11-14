// Types matching the backend's admin pricing DTOs (../swiftdrop-backend/API.md "Zones & pricing (admin, WP4)").
import type { DistrictCode } from "@/types";
import type { Vehicle } from "./types";

/** One vehicle of the rate card: the biggest parcel it takes and the price of one local leg. */
export interface VehicleLimit {
  vehicle: Vehicle;
  /** Vehicles are tried from the lowest; the first that carries and fits the parcel is used. */
  checkOrder: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  maxWeightKg: number;
  /** The pickup leg costs this, and the delivery leg again. */
  legFee: number;
}

/**
 * A rate card: GET /admin/pricing/rate-card (the active one) or one item of GET /admin/pricing/rate-cards (every
 * version, newest first). Previous versions never change: parcels keep the version they were priced with.
 */
export interface AdminRateCard {
  version: number;
  /** True for the one card quotes use now. */
  active: boolean;
  currency: string;
  baseFee: number;
  /** Billable kg included before perKgFee applies. */
  baseWeightKg: number;
  perKgFee: number;
  /** Volumetric weight (kg) = L × W × H (cm) ÷ this. */
  volumetricDivisor: number;
  codFee: number;
  linehaulPerKm: number;
  /** Straight line between district centres × this = road distance. */
  roadFactor: number;
  /** ISO timestamp */
  createdAt: string;
  /** Smallest first. */
  vehicles: VehicleLimit[];
}

/** One row of GET /admin/pricing/districts. */
export interface DistrictCentre {
  district: DistrictCode;
  name: string;
  /** False when the district has no centre, so routes to it can't be priced. */
  priced: boolean;
  latitude: number | null;
  longitude: number | null;
}

/** One destination of the route table. */
export interface PricedRoute {
  to: DistrictCode;
  toName: string;
  /** One decimal; 0 for the starting district; null when a district has no centre. */
  distanceKm: number | null;
  /** distanceKm × linehaulPerKm, two decimals; null when a district has no centre. */
  linehaul: number | null;
}

/** GET /admin/pricing/routes?from= */
export interface RouteTable {
  from: DistrictCode;
  fromName: string;
  rateCardVersion: number;
  currency: string;
  roadFactor: number;
  linehaulPerKm: number;
  /** All 25 districts, in district order. */
  routes: PricedRoute[];
}
