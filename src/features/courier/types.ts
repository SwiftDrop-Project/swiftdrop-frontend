import type { DistrictCode, PageResponse, ParcelStatus } from "@/types";

/*
 * Types matching the backend courier module's DTOs (../swiftdrop-backend/API.md "Courier",
 * courier/internal/dto/*.java). Change them together, and the response schemas in schemas.ts with them.
 *
 * A courier works PARCELS, one at a time. A dispatcher may group several parcels in one dispatch task (assignment),
 * but the courier sees and updates each parcel on its own, and a parcel is completed as soon as its own step closes,
 * whatever its sibling parcels are doing. The task completes by itself when its last parcel is completed: there is
 * no "complete task" call. What the courier may do next always comes from the backend (`nextStatuses`,
 * `canMarkUnableToCollect`) and whether they are done from `completed`: the frontend never works these out.
 */

/**
 * The kind of dispatch task the parcel is in (backend dispatch.AssignmentType). Courier work is only PICKUP and
 * DELIVERY. TRANSFER stays in the type so a backend answer that holds one still parses, but the screens never show a
 * transfer as courier work and offer no action for it (lib/labels isCourierTaskType).
 */
export type AssignmentType = "PICKUP" | "TRANSFER" | "DELIVERY";

/** The whole task's status (backend dispatch.AssignmentStatus). COMPLETED and CANCELLED are closed. */
export type AssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/** What happened to this parcel in this task (backend dispatch.ItemOutcome). Every parcel starts PENDING. */
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

/** Why the courier couldn't take a parcel ("Unable to Collect", backend dispatch.TaskProblem). OTHER needs a note. */
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

/** What the courier does with the parcel (backend courier Stop): collect it, or deliver it. */
export type Stop = "PICKUP" | "DELIVERY";

/** ContactResponse: the sender (pickup) or the recipient (delivery). `phone` is +947XXXXXXXX. */
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

/**
 * How the customer chose to pay the delivery fee (backend delivery.PaymentMethod): online, in cash to the courier at
 * pickup (the sender pays), or in cash at drop-off (the recipient pays). It is a choice made at booking, not a payment
 * status: SwiftDrop doesn't record payments yet, so ONLINE never means the fee was paid.
 */
export type FeePaymentMethod = "ONLINE" | "AT_PICKUP" | "AT_DROP_OFF";

/**
 * Where the delivery fee's payment stands (backend delivery.FeePaymentStatus), from the payment the backend recorded:
 * - AWAITING_CASH_COLLECTION: AT_PICKUP / AT_DROP_OFF, not collected yet
 * - CASH_COLLECTED: a courier collected it in cash
 * - AWAITING_ONLINE_VERIFICATION: ONLINE was chosen, but no verified payment is recorded (not paid, as far as we know)
 * - ONLINE_VERIFIED: a verified online payment is recorded
 * - NOT_RECORDED: booked before payment methods
 */
export type FeePaymentStatus =
  | "AWAITING_CASH_COLLECTION"
  | "CASH_COLLECTED"
  | "AWAITING_ONLINE_VERIFICATION"
  | "ONLINE_VERIFIED"
  | "NOT_RECORDED";

/**
 * DeliveryFeeResponse: SwiftDrop's delivery fee as fixed at booking, how the customer chose to pay it, and where its
 * payment stands. Never the cash on delivery (`codAmount`, the price of the goods).
 */
export interface DeliveryFee {
  amount: number;
  /** e.g. "LKR". */
  currency: string;
  /** null for parcels booked before payment methods. */
  paymentMethod: FeePaymentMethod | null;
  status: FeePaymentStatus;
  /** ISO timestamp: when it was collected or verified; null while unpaid. */
  collectedAt: string | null;
  /**
   * The status change of this step that must confirm the cash collection (`feeCollected: true`): PICKED_UP or
   * DELIVERED; null when nothing is collected in this step (always on a finished step). Decided by the backend.
   */
  collectOn: "PICKED_UP" | "DELIVERED" | null;
}

/** TaskResponse: the courier's dispatch task for this parcel. */
export interface CourierTask {
  assignmentId: string;
  type: AssignmentType;
  /** The WHOLE task's status. It becomes COMPLETED by itself when its last parcel is completed. */
  status: AssignmentStatus;
  /** This parcel's step in the task. */
  outcome: ItemOutcome;
  /**
   * Where the parcel is handed over (AT_BRANCH goes here): a pickup's destination branch, a delivery's origin branch
   * (where a failed delivery is returned, and where it is taken out from).
   */
  branch: DistrictCode | null;
  /** Why it couldn't be collected (NOT_COLLECTED, NOT_LOADED); otherwise null. */
  problem: TaskProblem | null;
  /** Who took the parcel at the branch (handover or return); otherwise null. */
  receivedBy: string | null;
}

/**
 * CourierDeliveryResponse: one parcel in the courier's lists.
 *
 * Privacy: `pickup` (the sender) only in an open pickup step, `recipient` only in an open delivery step. Both are null
 * once the parcel is completed or its task closed. `from` / `to` (city and district) are there
 * even when the contact is not.
 */
export interface CourierDelivery {
  parcelId: string;
  /** Normalised, e.g. "SD2611060001". Show it with formatTrackingNumber. */
  trackingNumber: string;
  /** The parcel's own life-cycle status (delivery). "Unable to Collect" doesn't change it. */
  status: ParcelStatus;
  stop: Stop;
  pickup: Contact | null;
  recipient: Contact | null;
  from: Place | null;
  to: Place | null;
  weightKg: number;
  /** Cash to collect in rupees; null when already paid. */
  codAmount: number | null;
  /**
   * The delivery fee and how it is paid. The backend always sends it; null only when an older backend leaves it out,
   * and then the screens show nothing about the fee.
   */
  deliveryFee: DeliveryFee | null;
  instructions: string | null;
  /** ISO timestamp: when the dispatcher created the task. */
  assignedAt: string;
  /** ISO timestamp: when the parcel last changed. */
  updatedAt: string;
  /** The statuses the courier may set now, in life-cycle order. Empty once completed or when the task is closed. */
  nextStatuses: ParcelStatus[];
  /** "Unable to Collect" is possible now (the parcel's step is PENDING in an open task). */
  canMarkUnableToCollect: boolean;
  /** The courier is done with this parcel in this task, whatever the other parcels of the task are doing. */
  completed: boolean;
  /** ISO timestamp; null while active (and for a parcel closed only because its task was cancelled). */
  completedAt: string | null;
  /** Once DELIVERED: who received it and whether the signed-slip photo is attached; otherwise null. */
  proof: DeliveryProof | null;
  task: CourierTask;
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

/**
 * ProofResponse: proof of delivery. `hasPhoto`: the photo of the delivery slip the recipient signed is attached (the
 * courier who delivered it reads it with GET /courier/deliveries/{parcelId}/proof; there is no public URL).
 */
export interface DeliveryProof {
  recipientName: string | null;
  hasPhoto: boolean;
}

/**
 * CourierDeliveryDetailResponse: GET /courier/deliveries/{parcelId}, and the answer of every status change and
 * "Unable to Collect" (with `completed` and `task.status` as they are after the step).
 */
export interface CourierDeliveryDetail extends CourierDelivery {
  history: ParcelHistoryEntry[];
  /** Only while FAILED. */
  failureReason: FailureReason | null;
}

/** ProofUploadResponse: POST /courier/deliveries/{parcelId}/proof. Send `proofPhotoId` with DELIVERED. */
export interface ProofUpload {
  proofPhotoId: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  uploadedAt: string;
}

/** CourierTodayResponse: GET /courier/deliveries/today. */
export interface CourierToday {
  /** Today in Sri Lankan time, "2026-11-05". */
  date: string;
  /** Active parcels. */
  toDo: number;
  /** Parcels completed today. */
  done: number;
  /** Open pickups, then the other active parcels (oldest first), then the completed ones (newest first). */
  items: CourierDelivery[];
}

/** GET /courier/deliveries/history: completed parcels, newest completion first; one entry per completed task. */
export type CourierDeliveryPage = PageResponse<CourierDelivery>;

/** Query of GET /courier/deliveries/history. `page` is 0-based; `size` 1-100. */
export interface DeliveryHistoryQuery {
  page?: number;
  size?: number;
  /** Spaces and case don't matter; an unknown number gives an empty page. */
  trackingNumber?: string;
  /** Only pickups or only deliveries. */
  type?: HistoryType;
  /** Only entries that ended this way. */
  outcome?: HistoryOutcome;
  /** Completion days (yyyy-mm-dd, Sri Lankan time), both included. */
  completedFrom?: string;
  completedTo?: string;
}

/** The courier's two kinds of work, as the History type filter. */
export type HistoryType = "PICKUP" | "DELIVERY";

/** The outcomes a history entry can have (an entry is listed once its step is completed). */
export type HistoryOutcome = "HANDED_OVER" | "DELIVERED" | "RETURNED" | "NOT_COLLECTED" | "NOT_LOADED";

/** The statuses a courier may set (never back to CREATED). */
export type CourierTargetStatus = Exclude<ParcelStatus, "CREATED">;

/**
 * StatusChangeRequest: body of POST /courier/deliveries/{parcelId}/status. Each status carries only its own fields
 * (the backend refuses the others): AT_BRANCH needs `receivedBy`, DELIVERED `recipientName` and the uploaded
 * `proofPhotoId`, FAILED `failureReason` (and a note of 3+ characters for OTHER). `feeCollected: true` confirms the
 * delivery fee's cash collection: sent with PICKED_UP or DELIVERED exactly when `deliveryFee.collectOn` is that status
 * (required then, refused otherwise). Never an amount.
 */
export type StatusChangeRequest =
  | { status: "PICKED_UP"; note?: string; feeCollected?: true }
  | { status: "OUT_FOR_DELIVERY"; note?: string }
  | { status: "AT_BRANCH"; receivedBy: string; note?: string }
  | { status: "DELIVERED"; recipientName: string; proofPhotoId: string; note?: string; feeCollected?: true }
  | { status: "FAILED"; failureReason: FailureReason; note?: string };

/** UnableToCollectRequest: body of POST /courier/deliveries/{parcelId}/unable-to-collect. OTHER needs a note. */
export interface UnableToCollectRequest {
  problem: TaskProblem;
  note?: string;
}
