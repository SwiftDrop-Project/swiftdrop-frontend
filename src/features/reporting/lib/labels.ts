import type { BadgeTone } from "@/components/ui/badge";
import type { UserStatus } from "@/features/identity";

const countFormat = new Intl.NumberFormat("en-LK");

/** 1250 → "1,250" */
export function formatCount(value: number): string {
  return countFormat.format(value);
}

/** 88.9 → "88.9%" */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Report days are plain dates ("2026-11-13"); read them as UTC so no time zone can move them to another day.
const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const longDayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-11-13" → "Fri, 13 Nov" */
export function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : dayFormat.format(parsed);
}

/** "2026-11-13" → "Friday 13 November 2026" */
export function formatLongDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : longDayFormat.format(parsed);
}

/** Account status as a badge, the same words and tones as the staff pages. */
export const ACCOUNT_STATUS: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  DISABLED: { label: "Blocked", tone: "error" },
  REMOVED: { label: "Removed", tone: "neutral" },
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "outline" },
  PENDING_EMAIL_VERIFICATION: { label: "Email not confirmed", tone: "outline" },
  PROFILE_INCOMPLETE: { label: "Profile not finished", tone: "outline" },
  REJECTED: { label: "Rejected", tone: "neutral" },
};
