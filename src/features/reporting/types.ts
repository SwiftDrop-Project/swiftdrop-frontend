// Types matching the backend reporting module's DTOs (see ../swiftdrop-backend/API.md, "Reports (admin, WP4)").
import type { UserStatus } from "@/features/identity";
import type { Role } from "@/types";

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
