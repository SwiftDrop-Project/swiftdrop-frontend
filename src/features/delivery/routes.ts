/** The customer's delivery pages. */
export const MY_DELIVERIES_HREF = "/customer/deliveries";
export const CREATE_DELIVERY_HREF = "/customer/deliveries/new";

/**
 * My deliveries with a tab and a tracking number search, e.g. /customer/deliveries?tab=active&q=SD2611. The default
 * tab ("all") and an empty search are left out, so the plain address is the full list. The header search uses `?q=`.
 */
export function myDeliveriesHref({ tab, q }: { tab: string; q: string }): string {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("tab", tab);
  if (q.trim() !== "") params.set("q", q.trim());
  const query = params.toString();
  return query ? `${MY_DELIVERIES_HREF}?${query}` : MY_DELIVERIES_HREF;
}

/** One delivery's details. */
export function deliveryHref(id: string): string {
  return `${MY_DELIVERIES_HREF}/${encodeURIComponent(id)}`;
}
