import type { ParcelStatus } from "@/types";

/** The tabs of My deliveries, kept in the address as `?tab=` ("all" is left out). */
export type DeliveryTab = "all" | "active" | "delivered" | "failed";

interface DeliveryTabOption {
  value: DeliveryTab;
  label: string;
  /** Sent to GET /deliveries as repeated `status`; empty means every status. */
  statuses: readonly ParcelStatus[];
  /** Shown when the tab has no deliveries, e.g. No active deliveries. */
  emptyTitle: string;
}

export const DELIVERY_TABS: readonly DeliveryTabOption[] = [
  { value: "all", label: "All", statuses: [], emptyTitle: "No deliveries" },
  {
    value: "active",
    label: "Active",
    // Everything not finished yet. A failed parcel goes back to a branch and becomes active again.
    statuses: ["CREATED", "PICKED_UP", "AT_BRANCH", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
    emptyTitle: "No active deliveries",
  },
  { value: "delivered", label: "Delivered", statuses: ["DELIVERED"], emptyTitle: "No delivered parcels yet" },
  { value: "failed", label: "Failed", statuses: ["FAILED"], emptyTitle: "No failed deliveries" },
];

/** The tab in `?tab=`; anything unknown is "all". */
export function parseDeliveryTab(value: string | null): DeliveryTab {
  return DELIVERY_TABS.find((tab) => tab.value === value)?.value ?? "all";
}

export function deliveryTab(value: DeliveryTab): DeliveryTabOption {
  return DELIVERY_TABS.find((tab) => tab.value === value) ?? DELIVERY_TABS[0];
}

/** The longest tracking number search the API accepts (API.md "My deliveries"). */
export const MAX_DELIVERY_SEARCH = 30;
