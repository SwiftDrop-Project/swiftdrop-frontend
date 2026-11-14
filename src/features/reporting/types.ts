// Types matching the backend reporting module's DTOs (see ../swiftdrop-backend/API.md, "Reports (admin, WP4)").
import type { UserStatus } from "@/features/identity";
import type { DistrictCode, ParcelStatus, Role } from "@/types";

/** Accounts per role. Removed accounts are not counted. */
export interface AccountCounts {
  total: number;
  customers: number;
  merchants: number;
  couriers: number;
  dispatchers: number;
  admins: number;
  /** Merchants with status PENDING_APPROVAL. */
  pendingMerchants: number;
}

/** One Sri Lanka day: parcels booked that day, and parcels that reached DELIVERED or FAILED that day. */
export interface DayCount {
  /** "2026-11-13" */
  date: string;
  created: number;
  delivered: number;
  failed: number;
}

export interface PeriodSummary {
  from: string;
  to: string;
  created: number;
  delivered: number;
  failed: number;
  /** delivered / (delivered + failed) × 100, one decimal; 0 when nothing finished. */
  successRate: number;
  /** Every day of the range, oldest first. */
  perDay: DayCount[];
}

export interface RecentAccount {
  id: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  /** ISO timestamp */
  createdAt: string;
}

/** GET /admin/reports/overview */
export interface AdminOverview {
  users: AccountCounts;
  today: DayCount;
  last7Days: PeriodSummary;
  recentUsers: RecentAccount[];
}

/* All Parcels (API.md "Parcels (admin, WP4)"). */

/** The `sort` parameter of GET /admin/parcels. */
export type ParcelSort = "NEWEST" | "OLDEST" | "FEE_HIGH" | "FEE_LOW";

/** The `payment` filter of GET /admin/parcels. */
export type ParcelPaymentFilter = "PREPAID" | "CASH_ON_DELIVERY";

export type FailureReason =
  | "RECIPIENT_UNAVAILABLE"
  | "WRONG_ADDRESS"
  | "RECIPIENT_REFUSED"
  | "ADDRESS_UNREACHABLE"
  | "PARCEL_DAMAGED"
  | "OTHER";

/** GET /admin/parcels/stats. `pending` = CREATED; `inTransit` = PICKED_UP + AT_BRANCH + IN_TRANSIT + OUT_FOR_DELIVERY. */
export interface ParcelStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  failed: number;
  byStatus: Record<ParcelStatus, number>;
}

/** One row of GET /admin/parcels. No phones or street addresses (see the details). */
export interface AdminParcel {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  senderType: "CUSTOMER" | "MERCHANT";
  /** The pickup contact's name. */
  senderName: string;
  receiverName: string;
  pickupCity: string;
  pickupDistrict: DistrictCode;
  deliveryCity: string;
  deliveryDistrict: DistrictCode;
  /** Only while AT_BRANCH. */
  currentBranch: DistrictCode | null;
  weightKg: number;
  feeAmount: number;
  currency: string;
  /** Cash to collect on delivery; null when already paid. */
  codAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParcelContact {
  name: string;
  /** +947XXXXXXXX */
  phone: string;
  addressLine: string;
  city: string;
  district: DistrictCode;
}

export interface ParcelTrackingEntry {
  status: ParcelStatus;
  occurredAt: string;
  /** Who made the change, e.g. CUSTOMER, COURIER, ADMIN. */
  actorRole: string | null;
  /** Only for AT_BRANCH. */
  branch: DistrictCode | null;
  note: string | null;
  failureReason: FailureReason | null;
}

/** GET /admin/parcels/{id} */
export interface AdminParcelDetail {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  sender: {
    type: "CUSTOMER" | "MERCHANT";
    accountId: string;
    accountName: string | null;
    accountEmail: string | null;
    businessName: string | null;
  };
  pickup: ParcelContact;
  recipient: ParcelContact;
  weightKg: number;
  codAmount: number | null;
  instructions: string | null;
  feeAmount: number;
  currency: string;
  merchantOrderRef: string | null;
  currentBranch: DistrictCode | null;
  failureReason: FailureReason | null;
  proofRecipientName: string | null;
  hasProofPhoto: boolean;
  createdAt: string;
  updatedAt: string;
  /** Newest first. */
  history: ParcelTrackingEntry[];
}

/** The filters of GET /admin/parcels and GET /admin/parcels/export. Every field is optional. */
export interface ParcelFilters {
  q?: string;
  statuses?: ParcelStatus[];
  pickupDistrict?: DistrictCode;
  deliveryDistrict?: DistrictCode;
  /** "2026-11-01", Sri Lanka days, both included. */
  createdFrom?: string;
  createdTo?: string;
  payment?: ParcelPaymentFilter;
  sort?: ParcelSort;
}
