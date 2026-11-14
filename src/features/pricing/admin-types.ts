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

/** The weight part of the fee for a parcel billed at `billableKg`. */
export interface WeightTier {
  billableKg: number;
  weightCharge: number;
}

/** One vehicle's tariff on the Delivery Rates page. */
export interface VehicleTariff {
  vehicle: Vehicle;
  /** One local leg. */
  legFee: number;
  /** Pickup and delivery together: what every parcel on this vehicle pays for the local legs. */
  bothLegs: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  maxWeightKg: number;
}

/** The full fee at one distance between branches; null when no vehicle takes the parcel. */
export interface SampleFee {
  distanceKm: number;
  total: number | null;
}

/** A typical parcel and what it costs at each sample distance. */
export interface SampleParcel {
  /** e.g. "SMALL_BOX" */
  key: string;
  name: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  /** null when no vehicle takes it (then every total is null). */
  vehicle: Vehicle | null;
  billableWeightKg: number;
  /** One per distance, in the order of `distancesKm`. */
  fees: SampleFee[];
}

/** GET /admin/pricing/tariff?version=: what one rate card charges. */
export interface AdminTariff {
  rateCardVersion: number;
  active: boolean;
  currency: string;
  createdAt: string;
  baseFee: number;
  baseWeightKg: number;
  perKgFee: number;
  volumetricDivisor: number;
  linehaulPerKm: number;
  codFee: number;
  /** Billable kg 1-50. */
  weightTiers: WeightTier[];
  /** Smallest first. */
  vehicles: VehicleTariff[];
  /** Road km between branches, shortest first; 0 = same district. */
  distancesKm: number[];
  samples: SampleParcel[];
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
