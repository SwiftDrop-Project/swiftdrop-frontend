/**
 * The life cycle of a parcel (backend delivery.ParcelStatus), in life-cycle order. Shared because StatusBadge in
 * components/ui and several features (delivery, dispatch, tracking) show it. A parcel passes through branches:
 * PICKED_UP → AT_BRANCH ⇄ IN_TRANSIT, AT_BRANCH → OUT_FOR_DELIVERY → DELIVERED or FAILED, FAILED → AT_BRANCH.
 */
export type ParcelStatus =
  | "CREATED"
  | "PICKED_UP"
  | "AT_BRANCH"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";
