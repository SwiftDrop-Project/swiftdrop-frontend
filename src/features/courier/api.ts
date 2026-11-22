import type { z } from "zod";
import { apiFetch, apiUrl } from "@/lib/api";
import { CourierResponseError } from "./lib/errors";
import { COURIER_PREVIEW } from "./preview/flag";
import { courierPreviewFetch, previewProofImageUrl } from "./preview/preview-api";
import {
  courierDeliveryDetailSchema,
  courierDeliveryPageSchema,
  courierTodaySchema,
  proofUploadSchema,
} from "./schemas";
import type {
  CourierDeliveryDetail,
  CourierDeliveryPage,
  CourierToday,
  DeliveryHistoryQuery,
  ProofUpload,
  StatusChangeRequest,
  UnableToCollectRequest,
} from "./types";

/*
 * Who answers the courier calls: the backend (apiFetch), or, only in development preview mode
 * (NEXT_PUBLIC_COURIER_PREVIEW=true, see preview/flag.ts), the in-memory sample data, which never calls fetch.
 * Preview answers go through the same schemas below.
 */
const request: typeof apiFetch = COURIER_PREVIEW ? courierPreviewFetch : apiFetch;

export const DELIVERIES = "/courier/deliveries";
const delivery = (parcelId: string) => `${DELIVERIES}/${encodeURIComponent(parcelId)}`;

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
 * The courier endpoints (API.md "Courier", role COURIER only; other roles get 403, other couriers' parcels 404). This
 * is the only courier client the courier screens use. Writes answer the parcel as it is after the change (with
 * `completed` and `task.status` already updated), so a screen shows that at once and then loads again.
 */
export const courierApi = {
  /** GET /courier/deliveries/today: active parcels (any day), plus the parcels completed today. */
  async today(signal?: AbortSignal): Promise<CourierToday> {
    const endpoint = `${DELIVERIES}/today`;
    return checked(courierTodaySchema, endpoint, await request<unknown>(endpoint, { signal }));
  },

  /** GET /courier/deliveries/history: completed parcels, newest completion first; one entry per completed task. */
  async history(
    { page = 0, size = 20, trackingNumber, type, outcome, completedFrom, completedTo }: DeliveryHistoryQuery = {},
    signal?: AbortSignal,
  ): Promise<CourierDeliveryPage> {
    const endpoint = `${DELIVERIES}/history`;
    const tracking = trackingNumber?.trim() || undefined;
    // Filters are applied by the backend before paging (never to the loaded page only); unset ones aren't sent.
    const query = { page, size, trackingNumber: tracking, type, outcome, completedFrom, completedTo };
    const data = await request<unknown>(endpoint, { query, signal });
    return checked(courierDeliveryPageSchema, endpoint, data);
  },

  /** GET /courier/deliveries/{parcelId}: one parcel with its history. 404 when it was never in your tasks. */
  async delivery(parcelId: string, signal?: AbortSignal): Promise<CourierDeliveryDetail> {
    const endpoint = delivery(parcelId);
    return checked(courierDeliveryDetailSchema, endpoint, await request<unknown>(endpoint, { signal }));
  },

  /**
   * GET /courier/deliveries/{parcelId}/history/{assignmentId}: one finished entry of the history exactly as it was
   * (that task's step, read-only, history up to when it finished). 404 for an unknown or foreign task, a parcel not
   * in it, or a step still open. Never falls back to the parcel's latest step.
   */
  async historyEntry(parcelId: string, assignmentId: string, signal?: AbortSignal): Promise<CourierDeliveryDetail> {
    const endpoint = `${delivery(parcelId)}/history/${encodeURIComponent(assignmentId)}`;
    return checked(courierDeliveryDetailSchema, endpoint, await request<unknown>(endpoint, { signal }));
  },

  /**
   * POST /courier/deliveries/{parcelId}/status: the parcel's next status (one of its `nextStatuses`). 409:
   * ASSIGNMENT_CLOSED, TASK_STEP_NOT_ALLOWED, INVALID_STATUS_TRANSITION, ASSIGNMENT_CHANGED: reload the parcel.
   */
  async changeStatus(parcelId: string, body: StatusChangeRequest): Promise<CourierDeliveryDetail> {
    const endpoint = `${delivery(parcelId)}/status`;
    return checked(courierDeliveryDetailSchema, endpoint, await request<unknown>(endpoint, { method: "POST", body }));
  },

  /**
   * POST /courier/deliveries/{parcelId}/unable-to-collect: the courier couldn't take the parcel (only while
   * `canMarkUnableToCollect`). The backend records NOT_COLLECTED or NOT_LOADED from the task; the parcel is completed.
   */
  async unableToCollect(parcelId: string, body: UnableToCollectRequest): Promise<CourierDeliveryDetail> {
    const endpoint = `${delivery(parcelId)}/unable-to-collect`;
    return checked(courierDeliveryDetailSchema, endpoint, await request<unknown>(endpoint, { method: "POST", body }));
  },

  /**
   * POST /courier/deliveries/{parcelId}/proof (multipart, field "file"): the photo of the delivery slip the recipient
   * signed, for a parcel out for delivery. Answers its `proofPhotoId`, to send with DELIVERED; it is attached only
   * then. 400 `fieldErrors.file` for a wrong or unreadable image, 409 as for status changes, 503 when the image
   * storage is down (nothing is kept).
   */
  async uploadProof(parcelId: string, photo: Blob, fileName = "delivery-slip.jpg"): Promise<ProofUpload> {
    const endpoint = `${delivery(parcelId)}/proof`;
    const body = new FormData();
    body.append("file", photo, fileName);
    return checked(proofUploadSchema, endpoint, await request<unknown>(endpoint, { method: "POST", body }));
  },

  /**
   * Where the browser loads the proof photo of a parcel this courier delivered (GET .../{parcelId}/proof). The
   * browser sends the login cookie itself; the image is never public. In preview mode, the sample photo in memory.
   */
  proofImageUrl(parcelId: string): string | null {
    return COURIER_PREVIEW ? previewProofImageUrl(parcelId) : apiUrl(`${delivery(parcelId)}/proof`);
  },
};
