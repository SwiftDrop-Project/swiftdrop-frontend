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
  distanceKm: number | null;
  lines: PriceLine[];
  note: string;
}

export type AssistantCard =
  | { type: "TRACKING"; data: AssistantParcel }
  | { type: "PARCEL_LIST"; data: { parcels: AssistantParcel[] } }
  | { type: "PRICE"; data: AssistantPrice };

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
