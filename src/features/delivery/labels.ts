import type { FailureReason } from "./types";

/** The words shown for each failure reason; the same as on the courier screens. */
export const FAILURE_REASON_LABEL: Record<FailureReason, string> = {
  RECIPIENT_UNAVAILABLE: "Recipient not available",
  WRONG_ADDRESS: "Wrong address",
  RECIPIENT_REFUSED: "Recipient refused the parcel",
  ADDRESS_UNREACHABLE: "Couldn't reach the address",
  PARCEL_DAMAGED: "Parcel damaged",
  OTHER: "Other",
};
