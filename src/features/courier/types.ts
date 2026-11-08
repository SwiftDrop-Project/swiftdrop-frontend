import type { DistrictCode, ParcelStatus } from "@/types";

/*
 * Types matching the backend courier module's DTOs (../swiftdrop-backend/API.md "Courier",
 * courier/internal/dto/*.java). Change them together.
 */

/** What the courier does next with a parcel: collect it (still CREATED) or deliver it. */
export type Stop = "PICKUP" | "DELIVERY";

/** Why a delivery failed (backend delivery.FailureReason). OTHER needs a note. */
export type FailureReason =
  | "RECIPIENT_UNAVAILABLE"
  | "WRONG_ADDRESS"
  | "RECIPIENT_REFUSED"
  | "ADDRESS_UNREACHABLE"
  | "PARCEL_DAMAGED"
  | "OTHER";

/** ContactResponse: a pickup or delivery contact. `phone` is +947XXXXXXXX. */
export interface Contact {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: DistrictCode;
}

/** CourierDeliveryResponse: one parcel in the courier's lists. */
export interface CourierDelivery {
  parcelId: string;
  /** Normalised, e.g. "SD2611004817". Show it with formatTrackingNumber. */
  trackingNumber: string;
  status: ParcelStatus;
  stop: Stop;
  pickup: Contact;
  recipient: Contact;
  weightKg: number;
  /** Cash to collect in rupees; null when already paid. */
  codAmount: number | null;
  instructions: string | null;
  /** ISO timestamp. Always set for the courier's own parcels; null only in the contract (unassigned). */
  assignedAt: string | null;
  /** ISO timestamp of the last change. */
  updatedAt: string;
  /** What this courier may set now, in life-cycle order; empty once DELIVERED or FAILED. */
  nextStatuses: ParcelStatus[];
}

/** HistoryEntryResponse: one status change. `failureReason` only for FAILED. */
export interface HistoryEntry {
  status: ParcelStatus;
  note: string | null;
  failureReason: FailureReason | null;
  occurredAt: string;
}

/** ProofResponse: who received the parcel. `hasPhoto` is unused until proof photos are built. */
export interface Proof {
  recipientName: string | null;
  hasPhoto: boolean;
}

/** CourierDeliveryDetailResponse: GET /courier/deliveries/{parcelId} and the status update's response. */
export interface CourierDeliveryDetail extends CourierDelivery {
  /** Newest first. */
  history: HistoryEntry[];
  /** Set once DELIVERED, otherwise null. */
  proof: Proof | null;
  /** Set once FAILED, otherwise null. */
  failureReason: FailureReason | null;
}

/** CourierTodayResponse: GET /courier/deliveries/today. */
export interface CourierToday {
  /** Today in Sri Lankan time, "2026-11-05". */
  date: string;
  toDo: number;
  done: number;
  /** Pickups, then the other open parcels, then finished ones (newest first). */
  items: CourierDelivery[];
}

/** A status the courier sets with a simple confirm (no proof, no reason). */
export type SimpleStepStatus = "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY";

/** StatusChangeRequest: body of POST /courier/deliveries/{parcelId}/status. */
export type StatusChangeRequest =
  | { status: SimpleStepStatus; note?: string }
  | { status: "DELIVERED"; recipientName: string; note?: string }
  | { status: "FAILED"; failureReason: FailureReason; note?: string };

/** Query of GET /courier/deliveries/history. `page` is 0-based. */
export interface HistoryQuery {
  page?: number;
  size?: number;
  /** Sent normalised (no spaces, upper case). */
  trackingNumber?: string;
}
