/*
 * Public API of the dispatch feature (backend module: dispatch).
 * Other features and app/ import only from "@/features/dispatch".
 */
export { AdminDispatchTabs } from "./components/admin-dispatch-tabs";
export { CourierTodayCard } from "./components/courier-today-card";
export { CourierWorkloadView } from "./components/courier-workload";
export { DeliveryIssues } from "./components/delivery-issues";
export { DispatchQueue } from "./components/dispatch-queue";
export { DispatcherOverviewCard } from "./components/dispatcher-overview-card";
export { TaskDetail } from "./components/task-detail";
export { TaskList } from "./components/task-list";
// Shared with the tracking feature's live board (same branch picker and remembered branch).
export { BranchSelect } from "./components/branch-select";
export { useDispatchBranch, useDistrictName } from "./hooks/use-dispatch-branch";
