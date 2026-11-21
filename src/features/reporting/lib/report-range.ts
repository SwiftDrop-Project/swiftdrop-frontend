import type { ReportRange } from "../types";

/** The longest range a report covers, the same limit as the backend. */
export const MAX_REPORT_DAYS = 366;

export type ReportPreset = "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";

export const REPORT_PRESETS: { value: ReportPreset; label: string }[] = [
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
  { value: "LAST_90_DAYS", label: "Last 90 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "CUSTOM", label: "Custom range" },
];

// Report days are Sri Lanka days. "en-CA" formats as YYYY-MM-DD.
const sriLankaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Colombo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in Sri Lanka, as "2026-11-20". */
export function sriLankaToday(now: Date = new Date()): string {
  return sriLankaDay.format(now);
}

/** Plain dates are worked out in UTC, so no time zone or daylight saving can move them to another day. */
function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function toDate(utc: Date): string {
  return utc.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const utc = toUtc(date);
  utc.setUTCDate(utc.getUTCDate() + days);
  return toDate(utc);
}

/** Days from `from` to `to`, both included. */
export function daysBetween(range: ReportRange): number {
  return Math.round((toUtc(range.to).getTime() - toUtc(range.from).getTime()) / 86_400_000) + 1;
}

/** The range a preset stands for, ending today. CUSTOM has no range of its own: the caller keeps the typed one. */
export function presetRange(preset: Exclude<ReportPreset, "CUSTOM">, today: string): ReportRange {
  const [year, month] = today.split("-").map(Number);
  switch (preset) {
    case "LAST_7_DAYS":
      return { from: addDays(today, -6), to: today };
    case "LAST_30_DAYS":
      return { from: addDays(today, -29), to: today };
    case "LAST_90_DAYS":
      return { from: addDays(today, -89), to: today };
    case "THIS_MONTH":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "LAST_MONTH": {
      const firstOfThisMonth = toUtc(`${today.slice(0, 7)}-01`);
      const lastOfLastMonth = new Date(Date.UTC(year, month - 1, 0));
      firstOfThisMonth.setUTCMonth(firstOfThisMonth.getUTCMonth() - 1);
      return { from: toDate(firstOfThisMonth), to: toDate(lastOfLastMonth) };
    }
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What is wrong with a typed range, in the backend's words, or null when it can be asked for. */
export function rangeProblem(range: ReportRange, today: string): string | null {
  if (!DATE.test(range.from)) return "Choose a start date.";
  if (!DATE.test(range.to)) return "Choose an end date.";
  if (range.from > range.to) return "The start date must be on or before the end date.";
  if (range.to > today) return "The end date can't be in the future.";
  if (daysBetween(range) > MAX_REPORT_DAYS) return `Choose a range of up to ${MAX_REPORT_DAYS} days.`;
  return null;
}

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "1 Nov 2026 to 20 Nov 2026" */
export function formatRange(range: ReportRange): string {
  return `${longDate.format(toUtc(range.from))} to ${longDate.format(toUtc(range.to))}`;
}
