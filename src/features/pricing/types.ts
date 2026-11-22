// Types matching the backend pricing module's DTOs (see ../swiftdrop-backend/API.md "Pricing (WP4)").
import type { DistrictCode } from "@/types";

/** The vehicle of the two local legs: pickup address → branch and branch → drop-off address (pricing.Vehicle). */
export type Vehicle = "BIKE" | "TUK_TUK" | "LORRY";

/** One part of the fee. The API lists them in this order; COD only with cash on delivery. */
export type FeeComponent = "BASE" | "WEIGHT" | "PICKUP" | "DELIVERY" | "LINEHAUL" | "COD";

/**
 * COMPLETE: every part is known. PROVISIONAL: no measurements, so no vehicle and no pickup and delivery legs.
 * MANUAL_QUOTE: no vehicle carries or fits the parcel, so there is no total.
 */
export type FeeEstimateStatus = "COMPLETE" | "PROVISIONAL" | "MANUAL_QUOTE";

/** Body of POST /pricing/estimate. The measurements (whole cm) come all three or none. */
export interface FeeEstimateRequest {
  pickupDistrict: DistrictCode;
  dropOffDistrict: DistrictCode;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  /** Default false: the parcel may lie on its side. */
  keepUpright?: boolean;
  /** Default false. Adds the COD handling fee; the amount to collect is not part of the fee. */
  cashOnDelivery?: boolean;
}

/** One line of the fee, e.g. { component: "WEIGHT", amount: 400 }. */
export interface FeeLine {
  component: FeeComponent;
  amount: number;
}

/** Response of POST /pricing/estimate. Nothing is saved: the fee charged comes back from POST /deliveries. */
export interface FeeEstimate {
  status: FeeEstimateStatus;
  /** null for MANUAL_QUOTE. */
  total: number | null;
  currency: string;
  rateCardVersion: number;
  /** The greater of the actual and the volumetric weight, rounded up to a whole kg. */
  billableWeightKg: number;
  /** L × W × H ÷ 5000; null without measurements. */
  volumetricWeightKg: number | null;
  vehicle: Vehicle | null;
  /** Between the two district branches; 0 inside one district. */
  distanceKm: number | null;
  lines: FeeLine[];
}
