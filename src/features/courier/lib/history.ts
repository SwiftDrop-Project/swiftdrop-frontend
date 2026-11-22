import type { DeliveryHistoryQuery, HistoryType } from "../types";
import { courierRoutes } from "./labels";

/*
 * /courier/history: GET /courier/deliveries/history (the parcels this courier completed, pickups and deliveries,
 * newest completion first). The page, the tracking number and the filters live in the URL, so a search can be
 * bookmarked and the top bar's search (lib/navigation SEARCH: /courier/history?q=…) lands here. The backend does the
 * searching, the filtering and the paging (filters are applied before paging, never to the loaded page only).
 */

/** The backend's default page size. */
export const HISTORY_PAGE_SIZE = 20;

/** Completion date filter: a preset, or a custom range (from/to). */
export type HistoryDate = "" | "today" | "7d" | "30d" | "custom";

export interface HistoryParams {
  /** 0-based. */
  page: number;
  /** As typed (trimmed); the backend ignores spaces and case. Empty: no search. */
  trackingNumber: string;
  /** Empty: all types. */
  type: "" | HistoryType;
  /** Empty: all dates. */
  date: HistoryDate;
  /** Custom range, yyyy-mm-dd (only with date "custom"); either may be empty. */
  from: string;
  to: string;
}

export const HISTORY_TYPES: { value: HistoryType; label: string }[] = [
  { value: "PICKUP", label: "Pickups" },
  { value: "DELIVERY", label: "Deliveries" },
];

export const HISTORY_DATES: { value: Exclude<HistoryDate, "">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (value: string) => DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const oneOf = <T extends string>(value: string | null, allowed: readonly { value: T }[]): T | "" =>
  allowed.some((option) => option.value === value) ? (value as T) : "";

/**
 * Reads `?q=`, `?page=` (1-based in the URL) and the filters (`?type=`, `?date=`, `?from=`, `?to=`). Bad values fall
 * back to "all". There is no outcome filter on this screen: an old `?outcome=` is ignored (never sent, never kept).
 */
export function historyParams(search: { get(name: string): string | null }): HistoryParams {
  const trackingNumber = (search.get("q") ?? "").trim();
  const shown = Number.parseInt(search.get("page") ?? "", 10);
  const date = oneOf(search.get("date"), HISTORY_DATES);
  const from = search.get("from") ?? "";
  const to = search.get("to") ?? "";
  return {
    trackingNumber,
    page: Number.isFinite(shown) && shown >= 1 ? shown - 1 : 0,
    type: oneOf(search.get("type"), HISTORY_TYPES),
    date,
    from: date === "custom" && isDay(from) ? from : "",
    to: date === "custom" && isDay(to) ? to : "",
  };
}

/** The history URL for these params; defaults are left out ("/courier/history", "?q=SD…", "?type=PICKUP&page=2"). */
export function historyHref({
  page = 0,
  trackingNumber = "",
  type = "",
  date = "",
  from = "",
  to = "",
}: Partial<HistoryParams> = {}): string {
  const query = new URLSearchParams();
  const tracking = trackingNumber.trim();
  if (tracking) query.set("q", tracking);
  if (type) query.set("type", type);
  if (date) query.set("date", date);
  if (date === "custom" && from) query.set("from", from);
  if (date === "custom" && to) query.set("to", to);
  if (page > 0) query.set("page", String(page + 1));
  const text = query.toString();
  return text ? `${courierRoutes.history}?${text}` : courierRoutes.history;
}

/** Whether any filter (not the search) is set. */
export function hasHistoryFilters(params: Pick<HistoryParams, "type" | "date">): boolean {
  return params.type !== "" || params.date !== "";
}

/** Today in Sri Lanka (Asia/Colombo), as yyyy-mm-dd. */
export function colomboToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** A yyyy-mm-dd day moved by whole days (calendar arithmetic, no time zone involved). */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The filters as the API takes them: "Today" is today's Sri Lankan date, "Last 7 days" today and the 6 days before,
 * "Last 30 days" today and the 29 days before; a custom range as chosen (either end may be open).
 */
export function historyFilterQuery(
  params: Pick<HistoryParams, "type" | "date" | "from" | "to">,
  now: Date = new Date(),
): Pick<DeliveryHistoryQuery, "type" | "completedFrom" | "completedTo"> {
  const today = colomboToday(now);
  const range: { completedFrom?: string; completedTo?: string } =
    params.date === "today"
      ? { completedFrom: today, completedTo: today }
      : params.date === "7d"
        ? { completedFrom: shiftDay(today, -6), completedTo: today }
        : params.date === "30d"
          ? { completedFrom: shiftDay(today, -29), completedTo: today }
          : params.date === "custom"
            ? { completedFrom: params.from || undefined, completedTo: params.to || undefined }
            : {};
  return { type: params.type || undefined, ...range };
}

/**
 * One history entry: the parcel page for that entry's task (`?task=`, read with GET …/history/{assignmentId}, so a
 * parcel's older entries open as they were, not as its latest step), linking back to the history (`?from=history`).
 */
export function parcelHrefFromHistory(parcelId: string, assignmentId: string): string {
  const query = new URLSearchParams({ from: "history", task: assignmentId });
  return `${courierRoutes.parcel(parcelId)}?${query.toString()}`;
}
