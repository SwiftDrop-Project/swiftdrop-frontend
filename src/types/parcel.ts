/**
 * The life cycle of a parcel (backend delivery.ParcelStatus). Shared because StatusBadge in
 * components/ui and several features (delivery, dispatch, tracking) show it.
 */
export type ParcelStatus =
  | "CREATED"
  | "PICKED_UP"
  /** Waiting at a SwiftDrop branch between pickup, transfers and the final delivery (multi-branch workflow). */
  | "AT_BRANCH"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";

