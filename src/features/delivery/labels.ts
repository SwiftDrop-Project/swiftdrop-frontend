import type { FailureReason, ParcelSize } from "./types";

/** The words shown for each failure reason; the same as on the courier screens. */
export const FAILURE_REASON_LABEL: Record<FailureReason, string> = {
  RECIPIENT_UNAVAILABLE: "Recipient not available",
  WRONG_ADDRESS: "Wrong address",
  RECIPIENT_REFUSED: "Recipient refused the parcel",
  ADDRESS_UNREACHABLE: "Couldn't reach the address",
  PARCEL_DAMAGED: "Parcel damaged",
  OTHER: "Other",
};

/** "40 × 30 × 12 cm" (length × width × height), with ", keep upright" when it must not lie on its side. */
export function sizeText({ lengthCm, widthCm, heightCm, keepUpright }: ParcelSize): string {
  const size = `${lengthCm} × ${widthCm} × ${heightCm} cm`;
  return keepUpright ? `${size}, keep upright` : size;
}
