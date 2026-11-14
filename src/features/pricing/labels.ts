import type { FeeComponent, Vehicle } from "./types";

/** The words shown for each vehicle. */
export const VEHICLE_LABEL: Record<Vehicle, string> = {
  BIKE: "Bike",
  TUK_TUK: "Tuk-tuk",
  LORRY: "Lorry",
};

/** The words shown for each line of the fee. */
export const FEE_COMPONENT_LABEL: Record<FeeComponent, string> = {
  BASE: "Base fee (first 1 kg)",
  WEIGHT: "Extra weight",
  PICKUP: "Pickup to branch",
  DELIVERY: "Branch to drop-off",
  LINEHAUL: "Between branches",
  COD: "Cash on delivery handling",
};
