import { PARCEL_STATUS_LABEL } from "@/components/ui/status-badge";
import { humanizeCode } from "@/lib/format";
import type { FailureReason, TrackingStatus } from "./types";

export function trackingStatusLabel(status: TrackingStatus): string {
  return status === "AT_BRANCH" ? "At branch" : PARCEL_STATUS_LABEL[status];
}

const FAILURE_REASON_LABEL: Record<string, string> = {
  RECIPIENT_UNAVAILABLE: "Nobody was available to receive it",
  WRONG_ADDRESS: "The address was wrong",
  RECIPIENT_REFUSED: "The recipient refused it",
  ADDRESS_UNREACHABLE: "The courier couldn't reach the address",
  PARCEL_DAMAGED: "The parcel was damaged",
};

export function failureReasonLabel(reason: FailureReason): string {
  const known = FAILURE_REASON_LABEL[reason];
  if (known) return known;
  const words = humanizeCode(reason);
  return words.charAt(0) + words.slice(1).toLowerCase();
}

/** Who made a change, in words, for the dispatchers' board. */
export function actorLabel(role: string | null): string {
  switch (role) {
    case "COURIER":
      return "Courier";
    case "DISPATCHER":
      return "Dispatcher";
    case "ADMIN":
      return "Admin";
    case "CUSTOMER":
      return "Customer";
    case "MERCHANT":
      return "Merchant";
    default:
      return "System";
  }
}
