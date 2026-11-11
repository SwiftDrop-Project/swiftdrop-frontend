// Types matching the backend dispatch module's DTOs (see ../swiftdrop-backend/API.md "Dispatch").
import type { DistrictCode, ParcelStatus, VehicleType } from "@/types";

/**
 * Parcel statuses as dispatch sees them. The shared ParcelStatus doesn't list AT_BRANCH yet (multi-branch
 * workflow), so dispatch adds it here.
 */
export type DispatchParcelStatus = ParcelStatus | "AT_BRANCH";

export type AssignmentType = "PICKUP" | "TRANSFER" | "DELIVERY";

export type AssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type ItemOutcome =
  | "PENDING"
  | "COLLECTED"
  | "LOADED"
  | "HANDED_OVER"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED"
  | "NOT_COLLECTED"
  | "NOT_LOADED";

export type TaskProblem =
  | "SENDER_UNAVAILABLE"
  | "PARCEL_NOT_READY"
  | "PARCEL_MISSING"
  | "PARCEL_DAMAGED"
  | "ADDRESS_UNREACHABLE"
  | "OTHER";

/** delivery.FailureReason. */
export type FailureReason = string;

/** Which queue: new parcels to collect, or parcels at the branch. */
export type QueueKind = "PICKUP" | "AT_BRANCH";

/** A city and district, never a street address, name or phone. */
export interface Place {
  city: string;
  district: DistrictCode;
}

/** GET /dispatch/queue */
export interface QueueParcel {
  parcelId: string;
  trackingNumber: string;
  status: DispatchParcelStatus;
  from: Place;
  to: Place;
  weightKg: number;
  currentBranch: DistrictCode | null;
  waitingSince: string;
  suggestedType: AssignmentType;
  suggestedOrigin: DistrictCode | null;
  suggestedDestination: DistrictCode | null;
}

export interface CourierRef {
  id: string;
  /** Null when identity no longer knows the courier. */
  fullName: string | null;
  phone: string | null;
}

/** One task in GET /dispatch/assignments. */
export interface AssignmentSummary {
  id: string;
  type: AssignmentType;
  status: AssignmentStatus;
  courier: CourierRef;
  originBranch: DistrictCode | null;
  destinationBranch: DistrictCode | null;
  scheduledFor: string;
  parcelCount: number;
  openParcelCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  version: number;
}

export interface AssignmentItem {
  parcelId: string;
  sequence: number;
  /** The parcel fields are null when delivery no longer knows the parcel. */
  trackingNumber: string | null;
  parcelStatus: DispatchParcelStatus | null;
  from: Place | null;
  to: Place | null;
  outcome: ItemOutcome;
  problem: TaskProblem | null;
  failureReason: FailureReason | null;
  note: string | null;
  receivedBy: string | null;
  recipientName: string | null;
  updatedAt: string;
  closedAt: string | null;
}

/** GET /dispatch/assignments/{id} and every task write. */
export interface AssignmentDetail {
  id: string;
  type: AssignmentType;
  status: AssignmentStatus;
  courier: CourierRef;
  originBranch: DistrictCode | null;
  destinationBranch: DistrictCode | null;
  scheduledFor: string;
  note: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: AssignmentItem[];
  version: number;
}

/** GET /dispatch/couriers/workload */
export interface CourierWorkload {
  courierId: string;
  fullName: string;
  phone: string;
  branch: DistrictCode | null;
  vehicleType: VehicleType | null;
  openTasks: number;
  openParcels: number;
  completedToday: number;
}

/** GET /dispatch/overview */
export interface DispatchOverview {
  branch: DistrictCode;
  waitingPickup: number;
  waitingAtBranch: number;
  assignedTasks: number;
  inProgressTasks: number;
  completedToday: number;
  issuesThisWeek: number;
  activeCouriers: number;
}

/** GET /dispatch/issues */
export interface DeliveryIssue {
  assignmentId: string;
  assignmentType: AssignmentType;
  parcelId: string;
  trackingNumber: string | null;
  parcelStatus: DispatchParcelStatus | null;
  outcome: ItemOutcome;
  problem: TaskProblem | null;
  failureReason: FailureReason | null;
  note: string | null;
  courier: CourierRef;
  updatedAt: string;
  /** The parcel is waiting for a new task now. */
  backInQueue: boolean;
}

/** POST /dispatch/assignments */
export interface CreateAssignmentRequest {
  courierId: string;
  type: AssignmentType;
  originBranch: DistrictCode | null;
  destinationBranch: DistrictCode | null;
  /** yyyy-mm-dd; today when left out. */
  scheduledFor?: string;
  note?: string;
  parcelIds: string[];
}

export interface AssignmentListParams {
  status?: AssignmentStatus;
  type?: AssignmentType;
  courierId?: string;
  branch?: DistrictCode;
  date?: string;
  page?: number;
  size?: number;
}
