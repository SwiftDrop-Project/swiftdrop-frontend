/*
 * How SwiftDrop shows names, money, dates, phone numbers and tracking numbers (DESIGN.md §11).
 * Use these everywhere so every page writes them the same way. Show the results with `tabular-nums`.
 */

const TIME_ZONE = "Asia/Colombo";

/** "Ayesha Fernando" → "Ayesha" */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** "Ayesha Fernando" → "AF", "Nimal" → "N" */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/** "+94771234567" → "+94 77 123 4567" */
export function formatPhone(phone: string): string {
  const match = /^\+94(\d{2})(\d{3})(\d{4})$/.exec(phone);
  return match ? `+94 ${match[1]} ${match[2]} ${match[3]}` : phone;
}

const amountFormat = new Intl.NumberFormat("en-LK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 2450 → "Rs. 2,450.00" */
export function formatRs(amount: number): string {
  return `Rs. ${amountFormat.format(amount)}`;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** ISO timestamp → "1 Nov 2026" (Sri Lankan time) */
export function formatDate(iso: string): string {
  const date = parse(iso);
  return date ? dateFormat.format(date) : iso;
}

/** ISO timestamp → "10:42 AM" (Sri Lankan time) */
export function formatTime(iso: string): string {
  const date = parse(iso);
  return date ? timeFormat.format(date) : iso;
}

/** ISO timestamp → "1 Nov 2026, 10:42 AM" (Sri Lankan time) */
export function formatDateTime(iso: string): string {
  const date = parse(iso);
  return date ? `${dateFormat.format(date)}, ${timeFormat.format(date)}` : iso;
}

/** " sd 2611 0048 17 " → "SD2611004817", for sending to the API and comparing. */
export function normalizeTrackingNumber(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** "SD2611004817" → "SD 2611 0048 17". Anything that isn't SD + 10 digits is returned as typed. */
export function formatTrackingNumber(value: string): string {
  const match = /^SD(\d{4})(\d{4})(\d{2})$/.exec(normalizeTrackingNumber(value));
  return match ? `SD ${match[1]} ${match[2]} ${match[3]}` : value;
}

/** "NUWARA_ELIYA" → "Nuwara Eliya" (fallback when the district list isn't loaded). */
export function humanizeCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
