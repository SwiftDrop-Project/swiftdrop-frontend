"use client";

import * as React from "react";
import type { DeliveryFilterValues } from "../types";

export const NO_DELIVERY_FILTERS: DeliveryFilterValues = { status: "", eventType: "", search: "", from: "", to: "" };
/** Search after typing stops for this long (Enter searches at once). */
const SEARCH_DELAY_MS = 400;

/**
 * Filter state of a delivery list: the filters sent to the backend, what's typed in the search box (it becomes
 * `filters.search` after a short pause or on Enter) and the page. Any filter change starts again at page 1.
 * `initial` sets the starting filters, e.g. a search taken from the page's address.
 */
export function useDeliveryFilters(initial?: Partial<DeliveryFilterValues>) {
  const [filters, setFilters] = React.useState<DeliveryFilterValues>(() => ({ ...NO_DELIVERY_FILTERS, ...initial }));
  const [searchText, setSearchText] = React.useState(() => initial?.search ?? "");
  const [page, setPage] = React.useState(0);

  // Search once typing pauses, so there's no request per key press.
  React.useEffect(() => {
    if (searchText.trim() === filters.search.trim()) return undefined;
    const timer = setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchText }));
      setPage(0);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, filters.search]);

  const update = React.useCallback((change: Partial<DeliveryFilterValues>) => {
    setFilters((current) => ({ ...current, ...change }));
    setPage(0);
  }, []);

  const clear = React.useCallback(() => {
    setFilters(NO_DELIVERY_FILTERS);
    setSearchText("");
    setPage(0);
  }, []);

  const filtered =
    filters.status !== "" ||
    filters.eventType !== "" ||
    filters.search.trim() !== "" ||
    filters.from !== "" ||
    filters.to !== "" ||
    searchText.trim() !== "";

  return { filters, searchText, setSearchText, page, setPage, update, clear, filtered };
}
