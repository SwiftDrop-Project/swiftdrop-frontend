/*
 * Public API of the courier feature (backend module: courier).
 * Other features and app/ import only from "@/features/courier".
 */
// The parcel screens (one parcel at a time; a dispatcher's task is never a screen of its own).
export { CourierTodayParcels } from "./components/today-parcels";
export { CourierParcelView } from "./components/parcel-detail-view";
export { CourierParcelHistory } from "./components/parcel-history";
// Development preview mode (NEXT_PUBLIC_COURIER_PREVIEW): renders nothing unless it is on.
export { CourierPreviewBanner } from "./components/preview-banner";
// The data layer (API.md "Courier", /courier/deliveries).
export { courierApi } from "./api";
export type * from "./types";
