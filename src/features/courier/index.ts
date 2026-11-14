/*
 * Public API of the courier feature (backend module: courier).
 * Other features and app/ import only from "@/features/courier".
 */
// TEMPORARY: the Stage 0 screens (legacy/ data layer) until F2/F3 replaces them with the task screens.
export { CourierToday } from "./components/courier-today";
export { CourierDeliveryDetail } from "./components/courier-delivery-detail";
export { MarkDeliveredForm } from "./components/mark-delivered-form";
export { MarkFailedForm } from "./components/mark-failed-form";
// The task screens (F2A: read only).
export { CourierTodayTasks } from "./components/today-tasks";
export { CourierTaskView } from "./components/task-detail-view";
export { CourierParcelView } from "./components/parcel-detail-view";
// The assignment-based data layer (API.md "Courier").
export { courierApi } from "./api";
export type * from "./types";
