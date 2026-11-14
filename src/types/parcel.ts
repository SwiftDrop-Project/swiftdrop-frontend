/**
 * The life cycle of a parcel (backend delivery.ParcelStatus), in the backend's (life-cycle) order. Shared because
 * StatusBadge in components/ui and several features (delivery, dispatch, courier, tracking) show it.
 *
 * Multi-branch: a parcel passes through branches and waits AT_BRANCH between tasks:
 * PICKED_UP → AT_BRANCH ⇄ IN_TRANSIT, AT_BRANCH → OUT_FOR_DELIVERY → DELIVERED or FAILED, FAILED → AT_BRANCH.
 * Only DELIVERED is final.
 */
export type ParcelStatus =
  | "CREATED"
  | "PICKED_UP"
  | "AT_BRANCH"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";
