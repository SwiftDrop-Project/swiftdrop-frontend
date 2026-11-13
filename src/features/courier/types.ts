import type { DistrictCode, PageResponse, ParcelStatus } from "@/types";

/*
 * Types matching the backend courier module's DTOs (../swiftdrop-backend/API.md "Courier",
 * courier/internal/dto/*.java). Change them together, and the response schemas in schemas.ts with them.
 *
 * A courier works TASKS (dispatch assignments). Each task holds one or more parcels ("items"). The task status and the
 * item outcomes belong to dispatch; the parcel status belongs to delivery. What the courier may do next comes from the
 * backend (allowedOutcomes, readyForHandover, canComplete): the frontend never works it out itself.
 */

/** What the courier does in the task (backend dispatch.AssignmentType). */
export type AssignmentType = "PICKUP" | "TRANSFER" | "DELIVERY";

/** Where the task is (backend dispatch.AssignmentStatus). COMPLETED and CANCELLED are closed. */
export type AssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/** What happened to one parcel in one task (backend dispatch.ItemOutcome). Every item starts PENDING. */
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

/** Why the courier couldn't collect or load a parcel (backend dispatch.TaskProblem). OTHER needs a note. */
export type TaskProblem =
  | "SENDER_UNAVAILABLE"
  | "PARCEL_NOT_READY"
  | "PARCEL_MISSING"
  | "PARCEL_DAMAGED"
  | "ADDRESS_UNREACHABLE"
  | "OTHER";

/** Why a delivery failed (backend delivery.FailureReason). OTHER needs a note. */
export type FailureReason =
  | "RECIPIENT_UNAVAILABLE"
  | "WRONG_ADDRESS"
  | "RECIPIENT_REFUSED"
  | "ADDRESS_UNREACHABLE"
  | "PARCEL_DAMAGED"
  | "OTHER";

/** ContactResponse: the sender (PICKUP) or recipient (DELIVERY). `phone` is +947XXXXXXXX. */
export interface Contact {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: DistrictCode;
}

/** PlaceResponse: where a parcel comes from or goes to, without personal data. */
export interface Place {
  city: string;
  district: DistrictCode;
}

/** CountsResponse: the parcels in a task. `problems`: not collected / not loaded, and failed deliveries. */
export interface TaskCounts {
  total: number;
  open: number;
  closed: number;
  problems: number;
}

/** AssignmentSummaryResponse: one task in the lists, and the answer of POST .../complete. */
export interface CourierTaskSummary {
  assignmentId: string;
  type: AssignmentType;
  status: AssignmentStatus;
  /** TRANSFER and DELIVERY; null for PICKUP. */
  originBranch: DistrictCode | null;
  /** PICKUP and TRANSFER; null for DELIVERY. */
  destinationBranch: DistrictCode | null;
  /** The Sri Lankan day the dispatcher planned it for, "2026-11-09". Information only: a later day can be worked now. */
  scheduledFor: string;
  /** The dispatcher's note. */
  note: string | null;
  /** ISO timestamp. */
  assignedAt: string;
  /** ISO timestamp; set once COMPLETED (null for a cancelled task). */
  completedAt: string | null;
  counts: TaskCounts;
  /** The task is open and every item is closed. */
  canComplete: boolean;
}

/** AssignmentItemResponse: one parcel in a task detail. */
export interface CourierTaskItem {
  parcelId: string;
  /** Normalised, e.g. "SD2611060001". Show it with formatTrackingNumber. */
  trackingNumber: string;
  sequence: number;
  parcelStatus: ParcelStatus;
  outcome: ItemOutcome;
  /** What the outcome endpoint accepts now, in life-cycle order. Never HANDED_OVER or RETURNED (handover). */
  allowedOutcomes: ItemOutcome[];
  /** Can be selected for the handover now. */
  readyForHandover: boolean;
  /** Only while the item and the task are open; never for TRANSFER. */
  contact: Contact | null;
  from: Place;
  to: Place;
  weightKg: number;
  /** Cash to collect in rupees. DELIVERY only; null otherwise or when nothing is due. */
  codAmount: number | null;
  /** DELIVERY only. */
  instructions: string | null;
  problem: TaskProblem | null;
  failureReason: FailureReason | null;
  recipientName: string | null;
  /** Who took the parcels at the branch (handover). */
  receivedBy: string | null;
  /** The courier's own last note on this item. */
  note: string | null;
  /** ISO timestamp. */
  updatedAt: string;
}

/** AssignmentDetailResponse: GET /courier/assignments/{id}, and the answer of every outcome and handover. */
export interface CourierTaskDetail extends CourierTaskSummary {
  /** By sequence. */
  items: CourierTaskItem[];
}

/** CourierTodayResponse: GET /courier/assignments/today. */
export interface CourierTasksToday {
  /** Today in Sri Lankan time. */
  date: string;
  /** Tasks not completed or cancelled (whatever day they are scheduled for). */
  open: number;
  completedToday: number;
  /** In progress, then assigned (oldest assignedAt first), then closed today (newest first). */
  assignments: CourierTaskSummary[];
}

/** GET /courier/assignments/history: completed and cancelled tasks, newest first. */
export type CourierTaskPage = PageResponse<CourierTaskSummary>;

/** Query of GET /courier/assignments/history. `page` is 0-based; `size` 1-100. */
export interface TaskHistoryQuery {
  page?: number;
  size?: number;
  /** Only the tasks that held this parcel. Spaces and case don't matter; unknown → empty page. */
  trackingNumber?: string;
}

/** HistoryEntryResponse: one status change, newest first, without notes. */
export interface ParcelHistoryEntry {
  status: ParcelStatus;
  /** Only for AT_BRANCH. */
  branch: DistrictCode | null;
  /** Only for FAILED. */
  failureReason: FailureReason | null;
  occurredAt: string;
}

/** MyItemResponse: one of the courier's own items for a parcel. */
export interface MyTaskItem {
  assignmentId: string;
  type: AssignmentType;
  outcome: ItemOutcome;
}

/** CourierParcelResponse: GET /courier/parcels/{parcelId}. */
export interface CourierParcelDetail {
  parcelId: string;
  trackingNumber: string;
  status: ParcelStatus;
  /** Only for AT_BRANCH. */
  currentBranch: DistrictCode | null;
  from: Place;
  to: Place;
  /** Newest task first. */
  myItems: MyTaskItem[];
  /** Only while the courier has an open item for it; never for TRANSFER. */
  contact: Contact | null;
  history: ParcelHistoryEntry[];
}

/** Outcomes sent to the outcome endpoint. HANDED_OVER and RETURNED go through the handover; PENDING never. */
export type RecordableOutcome = Exclude<ItemOutcome, "PENDING" | "HANDED_OVER" | "RETURNED">;

/**
 * ItemOutcomeRequest: body of POST /courier/assignments/{id}/items/{parcelId}/outcome. Each outcome carries only its
 * own fields (the backend refuses the others). A note is required (3+ chars) with problem or failureReason OTHER.
 */
export type ItemOutcomeRequest =
  | { outcome: "COLLECTED" | "LOADED"; note?: string }
  | { outcome: "NOT_COLLECTED" | "NOT_LOADED"; problem: TaskProblem; note?: string }
  | { outcome: "DELIVERED"; recipientName: string; note?: string }
  | { outcome: "FAILED"; failureReason: FailureReason; note?: string };

/** HandoverRequest: body of POST /courier/assignments/{id}/handover. All or nothing. */
export interface HandoverRequest {
  parcelIds: string[];
  /** The person at the branch who took the parcels. */
  receivedBy: string;
  note?: string;
}
