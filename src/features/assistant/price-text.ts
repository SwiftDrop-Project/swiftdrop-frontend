// How the PRICE card words the estimate: plain functions, tested in tests/assistant-conversation.test.mjs.
import type { AssistantPrice } from "./types";

/** "30 x 20 x 10 cm, by bike", or null when neither is known. */
export function priceCaption(price: AssistantPrice): string | null {
  const parts = [price.sizeCm ? `${price.sizeCm} cm` : null, price.vehicleText ? `by ${price.vehicleText}` : null];
  const caption = parts.filter(Boolean).join(", ");
  return caption || null;
}

/** " (billed as 3 kg)", " (bike)", " (122.6 km)": what a fee line was worked out from, or null. */
export function lineDetail(price: AssistantPrice, component: string): string | null {
  if (component === "WEIGHT" && price.billableWeightKg !== null) return ` (billed as ${price.billableWeightKg} kg)`;
  if ((component === "PICKUP" || component === "DELIVERY") && price.vehicleText) return ` (${price.vehicleText})`;
  if (component === "LINEHAUL" && price.distanceKm) return ` (${price.distanceKm} km)`;
  return null;
}
