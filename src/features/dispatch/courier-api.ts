import { apiFetch } from "@/lib/api";
import type { DistrictCode } from "@/types";
import type { AssignmentType, DispatchParcelStatus, ItemOutcome } from "./types";

/*
 * The courier's own parcels (API.md "Courier", role COURIER): the parcels in the dispatch tasks a dispatcher gave
 * them. Only what the "Today" card needs; the full courier screens live on the courier-screens branch.
 */

export interface CourierContact {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: DistrictCode;
}

export interface CourierPlace {
  city: string;
  district: DistrictCode;
}

export interface CourierTaskStep {
  assignmentId: string;
  type: AssignmentType;
  outcome: ItemOutcome;
  /** Where the parcel is handed over (AT_BRANCH goes here). */
  branch: DistrictCode | null;
}

export interface CourierParcel {
  parcelId: string;
  trackingNumber: string;
  status: DispatchParcelStatus;
  stop: "PICKUP" | "DELIVERY";
  pickup?: CourierContact | null;
  recipient?: CourierContact | null;
  from: CourierPlace;
  to: CourierPlace;
  weightKg: number;
  codAmount: number | null;
  instructions: string | null;
  assignedAt: string;
  updatedAt: string;
  nextStatuses: DispatchParcelStatus[];
  task: CourierTaskStep;
}

export interface CourierToday {
  date: string;
  toDo: number;
  done: number;
  items: CourierParcel[];
}

export const COURIER_FAILURE_REASONS = [
  "RECIPIENT_UNAVAILABLE",
  "WRONG_ADDRESS",
  "RECIPIENT_REFUSED",
  "ADDRESS_UNREACHABLE",
  "PARCEL_DAMAGED",
  "OTHER",
] as const;

export type CourierFailureReason = (typeof COURIER_FAILURE_REASONS)[number];

export type CourierStatusChange =
  | { status: "AT_BRANCH"; receivedBy: string; note?: string }
  | { status: "DELIVERED"; recipientName: string; note?: string }
  | { status: "FAILED"; failureReason: CourierFailureReason; note?: string }
  | {
      status: Exclude<DispatchParcelStatus, "AT_BRANCH" | "DELIVERED" | "FAILED">;
      note?: string;
    };

export const courierApi = {
  today(signal?: AbortSignal) {
    return apiFetch<CourierToday>("/courier/deliveries/today", { signal });
  },

  changeStatus(parcelId: string, body: CourierStatusChange) {
    return apiFetch<CourierParcel>(`/courier/deliveries/${encodeURIComponent(parcelId)}/status`, {
      method: "POST",
      body,
    });
  },
};
