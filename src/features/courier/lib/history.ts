import { courierRoutes } from "./labels";

/*
 * /courier/history: GET /courier/assignments/history (completed and cancelled tasks, newest first, the courier's own).
 * The page and the tracking number live in the URL, so a search can be bookmarked and the top bar's search
 * (lib/navigation SEARCH: /courier/history?q=…) lands here. The backend does the searching and the paging; there is
 * no other filter or order.
 */

/** The backend's default page size. */
export const HISTORY_PAGE_SIZE = 20;

export interface HistoryParams {
  /** 0-based. */
  page: number;
  /** As typed (trimmed); the backend ignores spaces and case. Empty: no search. */
  trackingNumber: string;
}

/** Reads `?q=` (tracking number, the top bar's name for it) and `?page=` (1-based in the URL). Bad values fall back. */
export function historyParams(search: { get(name: string): string | null }): HistoryParams {
  const trackingNumber = (search.get("q") ?? "").trim();
  const shown = Number.parseInt(search.get("page") ?? "", 10);
  return { trackingNumber, page: Number.isFinite(shown) && shown >= 1 ? shown - 1 : 0 };
}

/** The history URL for these params; defaults are left out ("/courier/history", "?q=SD…", "?page=2"). */
export function historyHref({ page = 0, trackingNumber = "" }: Partial<HistoryParams> = {}): string {
  const query = new URLSearchParams();
  const tracking = trackingNumber.trim();
  if (tracking) query.set("q", tracking);
  if (page > 0) query.set("page", String(page + 1));
  const text = query.toString();
  return text ? `${courierRoutes.history}?${text}` : courierRoutes.history;
}

/** A task opened from the history links back to the history (the detail page reads `?from=history`). */
export function taskHrefFromHistory(assignmentId: string): string {
  return `${courierRoutes.task(assignmentId)}?from=history`;
}
