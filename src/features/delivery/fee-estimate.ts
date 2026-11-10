/**
 * The fee shown on the review step, before the delivery is created.
 *
 * TEMPORARY: pricing (WP4) has no fee estimate yet, and the backend charges every delivery a flat Rs. 450.00
 * (delivery's FlatFeeQuoter), so this is the same flat amount. When a fee estimate endpoint exists, load the
 * estimate from it instead (pickup and recipient district, weight, cash on delivery) and keep `FeeEstimate` as
 * what FeeEstimateCard shows. The fee actually charged always comes back from POST /deliveries.
 */
export interface FeeEstimate {
  amount: number;
  /** How the amount was worked out, shown under it. */
  basis: string;
}

export const FLAT_FEE_ESTIMATE: FeeEstimate = {
  amount: 450,
  basis: "Flat rate to any district",
};
