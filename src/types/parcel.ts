/**
 * The life cycle of a parcel (backend delivery.ParcelStatus), in the backend's order. Shared because StatusBadge in
 * components/ui and several features (delivery, dispatch, courier, tracking) show it.
 *
 * Multi-branch: a parcel waits AT_BRANCH between tasks (after a pickup or a transfer, or after a failed delivery
 * was returned). Only DELIVERED is final; FAILED goes back to AT_BRANCH.
 */
export type ParcelStatus =
  | "CREATED"
  | "PICKED_UP"
  | "AT_BRANCH"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";

