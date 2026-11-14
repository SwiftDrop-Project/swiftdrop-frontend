/*
 * Public API of the pricing feature (backend module: pricing).
 * Other features and app/ import only from "@/features/pricing".
 */
export { useFeeEstimate, type FeeEstimateState } from "./hooks/use-fee-estimate";
export { FEE_COMPONENT_LABEL, VEHICLE_LABEL } from "./labels";
export type * from "./types";

// Admin Zones & Pricing page (/admin/zones, WP4).
export { ZonesPricing } from "./components/zones-pricing";
export type * from "./admin-types";
