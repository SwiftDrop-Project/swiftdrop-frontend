import { PARCEL_STATUS_LABEL } from "@/components/ui/status-badge";
import type { ParcelStatus } from "@/types";
import type { FailureReason, ParcelPaymentFilter, ParcelSort } from "../types";

export const FAILURE_REASON_LABEL: Record<FailureReason, string> = {
  RECIPIENT_UNAVAILABLE: "Recipient not available",
  WRONG_ADDRESS: "Wrong address",
  RECIPIENT_REFUSED: "Recipient refused the parcel",
  ADDRESS_UNREACHABLE: "Address couldn't be reached",
  PARCEL_DAMAGED: "Parcel damaged",
  OTHER: "Other reason",
};

/** The statuses that count as "on the way" on the summary cards (backend AdminParcelService.IN_TRANSIT). */
export const ON_THE_WAY: ParcelStatus[] = ["PICKED_UP", "AT_BRANCH", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

/**
 * The status filter: a group for "on the way", then every single status. The value is what the select holds; the
 * statuses are what the API gets.
 */
export const STATUS_FILTER_OPTIONS: { value: string; label: string; statuses: ParcelStatus[] }[] = [
  { value: "ON_THE_WAY", label: "On the way (all)", statuses: ON_THE_WAY },
  ...(Object.keys(PARCEL_STATUS_LABEL) as ParcelStatus[]).map((status) => ({
    value: status,
    label: PARCEL_STATUS_LABEL[status],
    statuses: [status],
  })),
];

export const SORT_OPTIONS: { value: ParcelSort; label: string }[] = [
  { value: "NEWEST", label: "Newest first" },
  { value: "OLDEST", label: "Oldest first" },
  { value: "FEE_HIGH", label: "Highest fee" },
  { value: "FEE_LOW", label: "Lowest fee" },
];

export const PAYMENT_OPTIONS: { value: ParcelPaymentFilter; label: string }[] = [
  { value: "PREPAID", label: "Prepaid" },
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
];

export const SENDER_TYPE_LABEL = { CUSTOMER: "Customer", MERCHANT: "Merchant" } as const;
