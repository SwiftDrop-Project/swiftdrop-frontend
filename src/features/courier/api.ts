import type { z } from "zod";
import { apiFetch } from "@/lib/api";
import { CourierResponseError } from "./lib/errors";
import { COURIER_PREVIEW } from "./preview/flag";
import { courierPreviewFetch } from "./preview/preview-api";
import {
  courierParcelDetailSchema,
  courierTaskDetailSchema,
  courierTaskPageSchema,
  courierTasksTodaySchema,
  courierTaskSummarySchema,
} from "./schemas";
import type {
  CourierParcelDetail,
  CourierTaskDetail,
  CourierTaskPage,
  CourierTasksToday,
  CourierTaskSummary,
  HandoverRequest,
  ItemOutcomeRequest,
  TaskHistoryQuery,
} from "./types";

/*
 * Who answers the courier calls: the backend (apiFetch), or, only in development preview mode
 * (NEXT_PUBLIC_COURIER_PREVIEW=true, see preview/flag.ts), the in-memory sample data, which never calls fetch.
 * Preview answers go through the same schemas below.
 */
const request: typeof apiFetch = COURIER_PREVIEW ? courierPreviewFetch : apiFetch;

const TASKS = "/courier/assignments";
const task = (assignmentId: string) => `${TASKS}/${encodeURIComponent(assignmentId)}`;

/** The answer, checked against the courier contract; a mismatch throws CourierResponseError. */
function checked<T>(schema: z.ZodType<T>, endpoint: string, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new CourierResponseError(
      endpoint,
      result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  return result.data;
}

/*
 * Courier endpoints (API.md "Courier", role COURIER only; other roles get 403, other couriers' tasks and parcels 404).
 * Writes answer the task as it is after the change, so the screen shows that instead of loading it again.
 */
export const courierApi = {
  /** GET /courier/assignments/today: every open task (any scheduled day), plus the ones closed today. */
  async today(signal?: AbortSignal): Promise<CourierTasksToday> {
    const endpoint = `${TASKS}/today`;
    return checked(courierTasksTodaySchema, endpoint, await request<unknown>(endpoint, { signal }));
  },

  /** GET /courier/assignments/history: completed and cancelled tasks, newest first. */
  async history(
    { page = 0, size = 20, trackingNumber }: TaskHistoryQuery = {},
    signal?: AbortSignal,
  ): Promise<CourierTaskPage> {
    const endpoint = `${TASKS}/history`;
    const tracking = trackingNumber?.trim() || undefined;
    const data = await request<unknown>(endpoint, { query: { page, size, trackingNumber: tracking }, signal });
    return checked(courierTaskPageSchema, endpoint, data);
  },

  /** GET /courier/assignments/{id}: one task with its parcels. 404 when it isn't yours. */
  async task(assignmentId: string, signal?: AbortSignal): Promise<CourierTaskDetail> {
    const endpoint = task(assignmentId);
    return checked(courierTaskDetailSchema, endpoint, await request<unknown>(endpoint, { signal }));
  },

  /**
   * POST /courier/assignments/{id}/items/{parcelId}/outcome: what happened to one parcel (not the handover). Moves the
   * parcel status in the same step. 409: ASSIGNMENT_CLOSED, TASK_STEP_NOT_ALLOWED, INVALID_STATUS_TRANSITION,
   * ASSIGNMENT_CHANGED (the dispatcher changed the task at the same moment): reload the task.
   */
  async recordOutcome(assignmentId: string, parcelId: string, body: ItemOutcomeRequest): Promise<CourierTaskDetail> {
    const endpoint = `${task(assignmentId)}/items/${encodeURIComponent(parcelId)}/outcome`;
    return checked(courierTaskDetailSchema, endpoint, await request<unknown>(endpoint, { method: "POST", body }));
  },

  /** POST /courier/assignments/{id}/handover: hands the parcels over at the branch, all or nothing. */
  async handover(assignmentId: string, body: HandoverRequest): Promise<CourierTaskDetail> {
    const endpoint = `${task(assignmentId)}/handover`;
    return checked(courierTaskDetailSchema, endpoint, await request<unknown>(endpoint, { method: "POST", body }));
  },

  /** POST /courier/assignments/{id}/complete (no body): once every item is closed. Changes no parcel status. */
  async complete(assignmentId: string): Promise<CourierTaskSummary> {
    const endpoint = `${task(assignmentId)}/complete`;
    return checked(courierTaskSummarySchema, endpoint, await request<unknown>(endpoint, { method: "POST" }));
  },

  /** GET /courier/parcels/{parcelId}: a parcel from one of your tasks, with its history and your items for it. */
  async parcel(parcelId: string, signal?: AbortSignal): Promise<CourierParcelDetail> {
    const endpoint = `/courier/parcels/${encodeURIComponent(parcelId)}`;
    return checked(courierParcelDetailSchema, endpoint, await request<unknown>(endpoint, { signal }));
  },
};
