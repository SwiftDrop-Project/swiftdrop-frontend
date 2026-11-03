/**
 * The life cycle of a parcel (backend delivery.ParcelStatus). Shared because StatusBadge in
 * components/ui and several features (delivery, dispatch, tracking) show it.
 */
export type ParcelStatus =
  | "CREATED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";

