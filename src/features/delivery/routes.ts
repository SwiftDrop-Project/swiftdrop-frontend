/** The customer's delivery pages. */
export const MY_DELIVERIES_HREF = "/customer/deliveries";
export const CREATE_DELIVERY_HREF = "/customer/deliveries/new";

/** One delivery's details. */
export function deliveryHref(id: string): string {
  return `${MY_DELIVERIES_HREF}/${encodeURIComponent(id)}`;
}
