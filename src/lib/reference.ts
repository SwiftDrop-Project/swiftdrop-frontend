import type { ParcelsPerMonth, VehicleType } from "@/types";

/** Options for "Parcels per month" (merchant sign-up), in the backend's order. */
export const PARCELS_PER_MONTH_OPTIONS: { value: ParcelsPerMonth; label: string }[] = [
  { value: "UNDER_50", label: "Under 50" },
  { value: "FROM_50_TO_200", label: "50 to 200" },
  { value: "FROM_200_TO_1000", label: "200 to 1,000" },
  { value: "OVER_1000", label: "Over 1,000" },
];

export const PARCELS_PER_MONTH_VALUES = PARCELS_PER_MONTH_OPTIONS.map((option) => option.value) as [
  ParcelsPerMonth,
  ...ParcelsPerMonth[],
];

export function parcelsPerMonthLabel(value: ParcelsPerMonth): string {
  return PARCELS_PER_MONTH_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** Courier vehicle types (matches shared.reference.VehicleType). */
export const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: "MOTORBIKE", label: "Motorbike" },
  { value: "THREE_WHEELER", label: "Three-wheeler" },
  { value: "VAN", label: "Van" },
  { value: "LORRY", label: "Lorry" },
];

export const VEHICLE_TYPE_VALUES = VEHICLE_TYPE_OPTIONS.map((option) => option.value) as [
  VehicleType,
  ...VehicleType[],
];

export function vehicleTypeLabel(value: VehicleType): string {
  return VEHICLE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
