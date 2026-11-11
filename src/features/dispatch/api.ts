import { apiFetch } from "@/lib/api";
import type { DistrictCode, PageResponse } from "@/types";
import type {
  AssignmentDetail,
  AssignmentListParams,
  AssignmentSummary,
  CourierWorkload,
  CreateAssignmentRequest,
  DeliveryIssue,
  DispatchOverview,
  QueueKind,
  QueueParcel,
} from "./types";

/* Dispatch endpoints (API.md "Dispatch"), for roles DISPATCHER and ADMIN. */

export const dispatchApi = {
  /** Parcels waiting for a task at the branch, oldest first. */
  queue(branch: DistrictCode, kind: QueueKind, signal?: AbortSignal) {
    return apiFetch<QueueParcel[]>("/dispatch/queue", { query: { branch, kind }, signal });
  },

  overview(branch: DistrictCode, signal?: AbortSignal) {
    return apiFetch<DispatchOverview>("/dispatch/overview", { query: { branch }, signal });
  },

  /** Active couriers with their open work, least busy first. All branches when `branch` is undefined. */
  workload(branch: DistrictCode | undefined, signal?: AbortSignal) {
    return apiFetch<CourierWorkload[]>("/dispatch/couriers/workload", { query: { branch }, signal });
  },

  issues(branch: DistrictCode, days: number, signal?: AbortSignal) {
    return apiFetch<DeliveryIssue[]>("/dispatch/issues", { query: { branch, days }, signal });
  },

  listAssignments(params: AssignmentListParams, signal?: AbortSignal) {
    return apiFetch<PageResponse<AssignmentSummary>>("/dispatch/assignments", {
      query: { ...params },
      signal,
    });
  },

  getAssignment(id: string, signal?: AbortSignal) {
    return apiFetch<AssignmentDetail>(`/dispatch/assignments/${encodeURIComponent(id)}`, { signal });
  },

  createAssignment(body: CreateAssignmentRequest) {
    return apiFetch<AssignmentDetail>("/dispatch/assignments", { method: "POST", body });
  },

  addParcels(id: string, parcelIds: string[]) {
    return apiFetch<AssignmentDetail>(`/dispatch/assignments/${encodeURIComponent(id)}/parcels`, {
      method: "POST",
      body: { parcelIds },
    });
  },

  removeParcel(id: string, parcelId: string) {
    return apiFetch<AssignmentDetail>(
      `/dispatch/assignments/${encodeURIComponent(id)}/parcels/${encodeURIComponent(parcelId)}`,
      { method: "DELETE" },
    );
  },

  reassign(id: string, courierId: string) {
    return apiFetch<AssignmentDetail>(`/dispatch/assignments/${encodeURIComponent(id)}/reassign`, {
      method: "POST",
      body: { courierId },
    });
  },

  cancel(id: string) {
    return apiFetch<AssignmentDetail>(`/dispatch/assignments/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    });
  },
};
