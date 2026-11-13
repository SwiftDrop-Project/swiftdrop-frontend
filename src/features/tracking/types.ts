// Types matching the backend tracking module's DTOs (see ../swiftdrop-backend/API.md "Tracking").
import type { DistrictCode, ParcelStatus } from "@/types";

/** The parcel statuses, plus AT_BRANCH (multi-branch), which the shared ParcelStatus doesn't have yet. */
export type TrackingStatus = ParcelStatus | "AT_BRANCH";

/** Fixed reason codes for a failed delivery (backend delivery.FailureReason). */
export type FailureReason =
  | "RECIPIENT_UNAVAILABLE"
  | "WRONG_ADDRESS"
  | "RECIPIENT_REFUSED"
  | "ADDRESS_UNREACHABLE"
  | "PARCEL_DAMAGED"
  | (string & {});

export interface TrackingPlace {
  city: string;
  district: DistrictCode;
}

export interface TrackingStep {
  status: TrackingStatus;
  /** Only for AT_BRANCH. */
  branch: DistrictCode | null;
  /** Only for FAILED. */
  failureReason: FailureReason | null;
  occurredAt: string;
}

/** GET /track/{trackingNumber}: the public view of one parcel. */
export interface Tracking {
  trackingNumber: string;
  status: TrackingStatus;
  currentBranch: DistrictCode | null;
  from: TrackingPlace | null;
  to: TrackingPlace | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  /** Oldest first. */
  history: TrackingStep[];
}

/** A message on /topic/parcels/{trackingNumber}. */
export interface TrackingUpdate {
  trackingNumber: string;
  status: TrackingStatus;
  branch: DistrictCode | null;
  failureReason: FailureReason | null;
  occurredAt: string;
  version: number;
}

/** A message on /topic/live, and an item of GET /tracking/live/recent (dispatchers and admins). */
export interface LiveEvent {
  eventId: string;
  parcelId: string;
  trackingNumber: string;
  fromStatus: TrackingStatus | null;
  toStatus: TrackingStatus;
  branch: DistrictCode | null;
  origin: DistrictCode | null;
  destination: DistrictCode | null;
  failureReason: FailureReason | null;
  actorRole: string | null;
  occurredAt: string;
  version: number;
}

/** Whether updates are arriving: over the WebSocket, being polled, or not yet connected. */
export type LiveState = "connecting" | "live" | "polling";
