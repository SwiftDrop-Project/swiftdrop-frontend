// Types for the assistant API (../swiftdrop-backend/API.md "Assistant").
import type { ParcelStatus } from "@/types";

export type ChatRole = "user" | "assistant";

/** One parcel as the assistant shows it (no personal data). */
export interface AssistantParcel {
  trackingNumber: string;
  status: ParcelStatus;
  statusText: string;
  /** "Colombo 03, Colombo" */
  from: string | null;
  to: string | null;
  currentBranch: string | null;
  /** Already worded in Sri Lankan time, e.g. "13 Nov 2026, 12:15 PM". */
  lastUpdate: string | null;
  updatedAt: string | null;
}

export interface PriceLine {
  component: string;
  amount: number;
}

export interface AssistantPrice {
  pickupDistrict: string;
  dropOffDistrict: string;
  weightKg: number;
  status: "COMPLETE" | "PROVISIONAL" | "MANUAL_QUOTE";
  currency: string;
  total: number | null;
  billableWeightKg: number | null;
  vehicle: string | null;
  /** "bike", "tuk-tuk" or "lorry": the vehicle whose fee is added for the pickup and the delivery. */
  vehicleText?: string | null;
  /** "30 x 20 x 10" (cm). */
  sizeCm?: string;
  distanceKm: number | null;
  lines: PriceLine[];
  note: string;
}

export type ReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

export interface ReportChange {
  difference: number;
  /** Null when the period before had none. */
  percent: number | null;
}

export interface ReportDay {
  date: string;
  /** "Mon 16 Nov" */
  dateText: string;
  booked: number;
  delivered: number;
  failed: number;
}

/** An admin's service report (API.md "Assistant", the REPORT card). Counts are numbers, dates yyyy-MM-dd. */
export interface AssistantReport {
  period: ReportPeriod;
  title: string;
  from: string;
  to: string;
  /** The last day counted: today when the period hasn't ended. */
  countedTo: string;
  partial: boolean;
  rangeText: string;
  booked: number;
  delivered: number;
  failed: number;
  /** delivered / (delivered + failed) in %, null when nothing was finished. */
  successRate: number | null;
  previous: {
    from: string;
    to: string;
    text: string;
    booked: number;
    delivered: number;
    failed: number;
    successRate: number | null;
  };
  changes: { booked: ReportChange; delivered: ReportChange; failed: ReportChange };
  /** Weekly and monthly reports only. */
  perDay?: ReportDay[];
  busiestDay?: { date: string; dateText: string; booked: number };
  topPickupDistricts: { district: string; count: number }[];
  topDropOffDistricts: { district: string; count: number }[];
  failureReasons: { reason: string; count: number }[];
  statusNow: { status: ParcelStatus; label: string; count: number }[];
  accountsNow: {
    total: number;
    customers: number;
    merchants: number;
    couriers: number;
    dispatchers: number;
    pendingMerchants: number;
  };
}

/** A short list of figures in an admin answer: "Couriers" / "3". */
export interface AssistantFacts {
  title: string;
  /** The period, e.g. "16 Nov 2026 to 22 Nov 2026", or null for figures of right now. */
  subtitle: string | null;
  facts: { label: string; value: string }[];
}

export type AssistantCard =
  | { type: "TRACKING"; data: AssistantParcel }
  /** `total` and `filters` come with an admin's search (more may match than the 10 shown). */
  | { type: "PARCEL_LIST"; data: { parcels: AssistantParcel[]; total?: number; filters?: string } }
  | { type: "FACTS"; data: AssistantFacts }
  | { type: "PRICE"; data: AssistantPrice }
  | { type: "REPORT"; data: AssistantReport };

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  cards: AssistantCard[];
  /** "gemini" or "rules" (the fallback without AI). */
  provider: string;
}

/** A message in the panel: what was sent, plus the cards that came with an answer. */
export interface ShownMessage extends ChatMessage {
  id: string;
  cards?: AssistantCard[];
}
