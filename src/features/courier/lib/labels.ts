import type { FailureReason, SimpleStepStatus, Stop } from "../types";

/** Failure reasons in the backend's order, with the words shown to the courier. */
export const FAILURE_REASON_OPTIONS: { value: FailureReason; label: string }[] = [
  { value: "RECIPIENT_UNAVAILABLE", label: "Recipient not available" },
  { value: "WRONG_ADDRESS", label: "Wrong address" },
  { value: "RECIPIENT_REFUSED", label: "Recipient refused the parcel" },
  { value: "ADDRESS_UNREACHABLE", label: "Couldn't reach the address" },
  { value: "PARCEL_DAMAGED", label: "Parcel damaged" },
  { value: "OTHER", label: "Other" },
];

export const FAILURE_REASON_VALUES = FAILURE_REASON_OPTIONS.map((option) => option.value) as [
  FailureReason,
  ...FailureReason[],
];

export function failureReasonLabel(reason: FailureReason): string {
  return FAILURE_REASON_OPTIONS.find((option) => option.value === reason)?.label ?? reason;
}

export const STOP_LABEL: Record<Stop, string> = {
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
};

/** Statuses set with a confirm dialog; DELIVERED and FAILED have their own forms. */
export const SIMPLE_STEPS: readonly SimpleStepStatus[] = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

export function isSimpleStep(status: string): status is SimpleStepStatus {
  return (SIMPLE_STEPS as readonly string[]).includes(status);
}

/** Button labels for each step. */
export const STEP_ACTION_LABEL: Record<SimpleStepStatus | "DELIVERED" | "FAILED", string> = {
  PICKED_UP: "Mark as picked up",
  IN_TRANSIT: "Mark as in transit",
  OUT_FOR_DELIVERY: "Mark as out for delivery",
  DELIVERED: "Mark as delivered",
  FAILED: "Mark as failed",
};

/** Lower-case words for sentences: "Mark SD 2611 0048 17 as picked up?" */
export const STEP_WORDS: Record<SimpleStepStatus, string> = {
  PICKED_UP: "picked up",
  IN_TRANSIT: "in transit",
  OUT_FOR_DELIVERY: "out for delivery",
};

const weightFormat = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2 });

/** 1.2 → "1.2 kg" */
export function formatWeight(weightKg: number): string {
  return `${weightFormat.format(weightKg)} kg`;
}

/** DELIVERED or FAILED: nothing left for the courier to do. */
export function isFinished(status: string): boolean {
  return status === "DELIVERED" || status === "FAILED";
}

/** Courier pages. */
export const courierRoutes = {
  today: "/courier",
  history: "/courier/history",
  parcel: (parcelId: string) => `/courier/deliveries/${encodeURIComponent(parcelId)}`,
  delivered: (parcelId: string) => `/courier/deliveries/${encodeURIComponent(parcelId)}/delivered`,
  failed: (parcelId: string) => `/courier/deliveries/${encodeURIComponent(parcelId)}/failed`,
};
