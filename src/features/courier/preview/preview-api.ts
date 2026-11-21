import { ApiError, type apiFetch } from "@/lib/api";
import type { ApiErrorCode, PageResponse, ParcelStatus } from "@/types";
import type {
  CourierDelivery,
  CourierDeliveryDetail,
  CourierTargetStatus,
  CourierToday,
  FailureReason,
  ProofUpload,
  TaskProblem,
} from "../types";
import { PROOF_MESSAGES, proofFileError } from "../schemas";
import {
  colomboDay,
  createSampleStore,
  startOfColomboDay,
  type PreviewItem,
  type PreviewParcel,
  type PreviewStore,
  type PreviewTask,
} from "./data";
import {
  canMarkUnableToCollect,
  closes,
  handOverBranch,
  nextStatuses,
  outcomeFor,
  parcelCanMoveTo,
  atTheRightBranch,
  stepStatuses,
  unableToCollectOutcome,
} from "./rules";

/*
 * PREVIEW ONLY. Answers the courier endpoints (/courier/deliveries/*) from the sample data in data.ts, in the
 * browser's memory, following the backend's CourierDeliveryService. It never calls fetch: nothing reaches the backend
 * or the database. api.ts uses it instead of apiFetch when preview mode is on (preview/flag.ts), so every answer still
 * goes through the same response schemas.
 */

type RequestOptions = NonNullable<Parameters<typeof apiFetch>[1]>;

let store: PreviewStore | null = null;
/** A short pause on every call, so loading states show as they would against a server. */
let delayMs = 250;

/** A proof photo "uploaded" in preview mode: kept in this browser's memory as a local object URL, never sent. */
interface PreviewPhoto {
  parcelId: string;
  url: string;
  attached: boolean;
}

let photos = new Map<string, PreviewPhoto>();

function data(): PreviewStore {
  store ??= createSampleStore();
  return store;
}

/** Starts again from the sample data (tests; a full page reload does the same in the browser). */
export function resetCourierPreview(now?: Date, options: { delayMs?: number } = {}): void {
  store = createSampleStore(now);
  photos = new Map();
  if (options.delayMs !== undefined) delayMs = options.delayMs;
}

/** Where the preview shows a delivered parcel's proof photo from: the sample slip or the photo the user picked. */
export function previewProofImageUrl(parcelId: string): string | null {
  const parcel = data().parcels.get(parcelId);
  return parcel?.status === "DELIVERED" ? parcel.proofPhotoUrl : null;
}

const MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  NOT_FOUND: "We couldn't find that.",
  VALIDATION_FAILED: "Check the highlighted fields.",
  TASK_STEP_NOT_ALLOWED: "This step isn't possible for this parcel now. Refresh to see your task.",
  ASSIGNMENT_CLOSED: "This task is already completed or was cancelled.",
  INVALID_STATUS_TRANSITION: "This parcel can't move to that status now.",
  SERVICE_UNAVAILABLE: "This isn't available yet. Please try again later.",
};

function fail(status: number, code: ApiErrorCode, fieldErrors?: Record<string, string>): never {
  throw new ApiError({ status, code, message: MESSAGES[code] ?? "Something went wrong.", fieldErrors });
}

const notFound = (): never => fail(404, "NOT_FOUND");
const invalid = (field: string, message: string): never => fail(400, "VALIDATION_FAILED", { [field]: message });

// ---- The courier's step for a parcel (CourierTask) ----

interface Step {
  task: PreviewTask;
  item: PreviewItem;
  completed: boolean;
  closed: boolean;
}

const taskClosed = (task: PreviewTask) => task.status === "COMPLETED" || task.status === "CANCELLED";

function step(task: PreviewTask, item: PreviewItem): Step {
  const completed = closes(task.type, item.outcome);
  return { task, item, completed, closed: completed || taskClosed(task) };
}

/** The open step for this parcel if any, else the most recent one (tasks are newest first). 404 if never theirs. */
function stepFor(parcelId: string): Step {
  let latest: Step | null = null;
  for (const task of data().tasks) {
    const item = task.items.find((entry) => entry.parcelId === parcelId);
    if (!item) continue;
    const found = step(task, item);
    if (!found.closed) return found;
    latest ??= found;
  }
  return latest ?? notFound();
}

function parcelOf(parcelId: string): PreviewParcel {
  return data().parcels.get(parcelId) ?? notFound();
}

// ---- Views (the backend's courier DTOs) ----

function view(parcel: PreviewParcel, { task, item, completed, closed }: Step): CourierDelivery {
  const place = (contact: PreviewParcel["sender"]) => ({ city: contact.city, district: contact.district });
  return {
    parcelId: parcel.id,
    trackingNumber: parcel.trackingNumber,
    status: parcel.status,
    stop: task.type === "PICKUP" ? "PICKUP" : "DELIVERY",
    // Privacy: only the contact this step needs (sender for a pickup, recipient for a delivery), only while open.
    pickup: task.type === "PICKUP" && !closed ? { ...parcel.sender } : null,
    recipient: task.type === "DELIVERY" && !closed ? { ...parcel.recipient } : null,
    from: place(parcel.sender),
    to: place(parcel.recipient),
    weightKg: parcel.weightKg,
    codAmount: parcel.codAmount,
    instructions: parcel.instructions,
    assignedAt: task.assignedAt,
    updatedAt: parcel.updatedAt,
    nextStatuses: nextStatuses(
      { type: task.type, outcome: item.outcome, closed, originBranch: task.originBranch },
      parcel.status,
      parcel.currentBranch,
    ),
    canMarkUnableToCollect: canMarkUnableToCollect(task.type, item.outcome, closed),
    completed,
    completedAt: completed ? item.closedAt : null,
    // Task-scoped, as the backend: only the delivery entry that delivered the parcel carries the proof.
    proof:
      task.type === "DELIVERY" && item.outcome === "DELIVERED" && completed && parcel.status === "DELIVERED"
        ? { recipientName: parcel.proofRecipientName, hasPhoto: parcel.proofPhotoUrl !== null }
        : null,
    task: {
      assignmentId: task.assignmentId,
      type: task.type,
      status: task.status,
      outcome: item.outcome,
      branch: handOverBranch(task.type, task.originBranch, task.destinationBranch),
      problem: item.problem,
      receivedBy: item.receivedBy,
    },
  };
}

function detailView(parcel: PreviewParcel, found: Step, until?: string): CourierDeliveryDetail {
  return {
    ...view(parcel, found),
    // Newest first, without notes; for a history entry, only what happened until it finished.
    history: [...parcel.history]
      .filter((entry) => until === undefined || entry.occurredAt <= until)
      .reverse()
      .map((entry) => ({ ...entry })),
    // Only on the delivery that failed and waits to be returned, as the backend.
    failureReason:
      found.task.type === "DELIVERY" && found.item.outcome === "FAILED" && parcel.status === "FAILED"
        ? parcel.failureReason
        : null,
  };
}

// ---- Reads ----

function today(): CourierToday {
  const { now, tasks, parcels } = data();
  const startOfToday = startOfColomboDay(now).toISOString();
  const steps = new Map<string, Step>();
  for (const task of tasks) {
    if (task.status === "CANCELLED") continue;
    for (const item of task.items) {
      if (item.closedAt !== null && item.closedAt < startOfToday) continue;
      const found = step(task, item);
      const kept = steps.get(item.parcelId);
      // A parcel in two of the courier's tasks today shows once: the open step wins; if both are finished, the most
      // recently finished one (as the backend).
      const newer = (found.item.closedAt ?? found.item.updatedAt) > (kept?.item.closedAt ?? kept?.item.updatedAt ?? "");
      if (!kept || (kept.closed && !found.closed) || (kept.closed && found.closed && newer)) steps.set(item.parcelId, found);
    }
  }
  const group = (found: Step) => (found.closed ? 2 : found.task.type === "PICKUP" ? 0 : 1);
  const list = [...steps.values()]
    .filter((found) => parcels.has(found.item.parcelId))
    .sort((a, b) => {
      if (group(a) !== group(b)) return group(a) - group(b);
      if (a.closed) return b.item.updatedAt.localeCompare(a.item.updatedAt);
      return a.task.assignedAt.localeCompare(b.task.assignedAt) || a.item.sequence - b.item.sequence;
    });
  return {
    date: colomboDay(now),
    toDo: list.filter((found) => !found.closed).length,
    done: list.filter((found) => found.completed).length,
    items: list.map((found) => view(parcels.get(found.item.parcelId)!, found)),
  };
}

function history(query: RequestOptions["query"]): PageResponse<CourierDelivery> {
  const page = Number(query?.page ?? 0);
  const size = Number(query?.size ?? 20);
  if (!Number.isInteger(page) || page < 0) invalid("page", "Use a page number of 0 or more.");
  if (!Number.isInteger(size) || size < 1 || size > 100) invalid("size", "Use a page size from 1 to 100.");
  const number = String(query?.trackingNumber ?? "").replace(/\s+/g, "").toUpperCase();
  const { tasks, parcels } = data();
  const parcelFilter = number ? [...parcels.values()].find((parcel) => parcel.trackingNumber === number)?.id : null;
  if (number && !parcelFilter) return { content: [], page, size, totalElements: 0, totalPages: 0 };

  const filter = historyFilter(query);
  const completed = tasks
    .flatMap((task) => task.items.map((item) => step(task, item)))
    .filter((found) => found.completed && (!parcelFilter || found.item.parcelId === parcelFilter))
    .filter(filter)
    .sort((a, b) => (b.item.closedAt ?? "").localeCompare(a.item.closedAt ?? ""));
  const content = completed
    .slice(page * size, page * size + size)
    .map((found) => view(parcels.get(found.item.parcelId)!, found));
  return { content, page, size, totalElements: completed.length, totalPages: Math.ceil(completed.length / size) };
}

const HISTORY_OUTCOMES = ["HANDED_OVER", "DELIVERED", "RETURNED", "NOT_COLLECTED", "NOT_LOADED"];
const HISTORY_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The history filters, as the backend: type, outcome, completion days in Sri Lankan time (both included), checked
 * with the same field errors, applied before paging.
 */
function historyFilter(query: RequestOptions["query"]): (found: Step) => boolean {
  const text = (name: string) => String(query?.[name] ?? "").trim();
  const type = text("type").toUpperCase();
  const outcome = text("outcome").toUpperCase();
  const from = text("completedFrom");
  const to = text("completedTo");
  if (type && type !== "PICKUP" && type !== "DELIVERY") invalid("type", "Choose pickups or deliveries.");
  if (outcome && !HISTORY_OUTCOMES.includes(outcome)) invalid("outcome", "Choose one of the listed outcomes.");
  if (from && !HISTORY_DAY.test(from)) invalid("completedFrom", "Use a date like 2026-11-21.");
  if (to && !HISTORY_DAY.test(to)) invalid("completedTo", "Use a date like 2026-11-21.");
  if (from && to && to < from) invalid("completedTo", "Choose an end date on or after the start date.");
  return (found) => {
    if (type && found.task.type !== type) return false;
    if (outcome && found.item.outcome !== outcome) return false;
    const day = found.item.closedAt ? colomboDay(new Date(found.item.closedAt)) : null;
    if (from && (!day || day < from)) return false;
    return !to || (day !== null && day <= to);
  };
}

function detail(parcelId: string): CourierDeliveryDetail {
  const found = stepFor(parcelId);
  return detailView(parcelOf(parcelId), found);
}

/**
 * GET …/{parcelId}/history/{assignmentId}, as the backend: that task's finished step for this parcel, read-only,
 * with the history up to when it finished. 404 for an unknown task, a parcel not in it, or a step still open.
 */
function historyEntry(parcelId: string, assignmentId: string): CourierDeliveryDetail {
  const task = data().tasks.find((candidate) => candidate.assignmentId === assignmentId) ?? notFound();
  const item = task.items.find((entry) => entry.parcelId === parcelId) ?? notFound();
  const found = step(task, item);
  if (!found.closed) notFound();
  return detailView(parcelOf(parcelId), found, item.closedAt ?? item.updatedAt);
}

// ---- Writes ----

const STATUSES: ParcelStatus[] = ["CREATED", "PICKED_UP", "AT_BRANCH", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"];
const FAILURE_REASONS: FailureReason[] = [
  "RECIPIENT_UNAVAILABLE",
  "WRONG_ADDRESS",
  "RECIPIENT_REFUSED",
  "ADDRESS_UNREACHABLE",
  "PARCEL_DAMAGED",
  "OTHER",
];
const PROBLEMS: TaskProblem[] = [
  "SENDER_UNAVAILABLE",
  "PARCEL_NOT_READY",
  "PARCEL_MISSING",
  "PARCEL_DAMAGED",
  "ADDRESS_UNREACHABLE",
  "OTHER",
];

const text = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/** The task outcome changed: close the item if the outcome closes it, start the task, complete it when all closed. */
function record(found: Step, outcome: PreviewItem["outcome"], fields: Partial<PreviewItem>, at: string) {
  const { task, item } = found;
  Object.assign(item, fields, { outcome, updatedAt: at });
  if (closes(task.type, outcome)) item.closedAt = at;
  if (task.status === "ASSIGNED") task.status = "IN_PROGRESS";
  // completeIfFinished: the task completes by itself when its last parcel is closed.
  if (task.items.every((entry) => closes(task.type, entry.outcome))) task.status = "COMPLETED";
}

function changeStatus(parcelId: string, body: Record<string, unknown>): CourierDeliveryDetail {
  // 1. The request (400), with the rules that depend on the status.
  const status = body.status as ParcelStatus;
  if (!STATUSES.includes(status)) invalid("status", "Select the new status.");
  const note = text(body.note);
  const recipientName = text(body.recipientName);
  const receivedBy = text(body.receivedBy);
  const failureReason = body.failureReason as FailureReason | undefined;
  if (note && note.length > 500) invalid("note", "Keep the note under 500 characters.");
  if (body.recipientName !== undefined && status !== "DELIVERED") invalid("recipientName", "Only for delivered parcels.");
  if (body.proofPhotoId !== undefined && status !== "DELIVERED") invalid("proofPhotoId", "Only for delivered parcels.");
  if (body.failureReason !== undefined && status !== "FAILED") invalid("failureReason", "Only for failed deliveries.");
  if (body.receivedBy !== undefined && status !== "AT_BRANCH") {
    invalid("receivedBy", "Only when you hand the parcel over at a branch.");
  }
  if (status === "DELIVERED" && (!recipientName || recipientName.length < 2 || recipientName.length > 100)) {
    invalid("recipientName", "Enter the name of the person who received the parcel.");
  }
  if (status === "DELIVERED" && typeof body.proofPhotoId !== "string") {
    invalid("proofPhotoId", PROOF_MESSAGES.required);
  }
  if (status === "FAILED" && !FAILURE_REASONS.includes(failureReason as FailureReason)) {
    invalid("failureReason", "Select why the delivery failed.");
  }
  if (status === "AT_BRANCH" && (!receivedBy || receivedBy.length < 2 || receivedBy.length > 100)) {
    invalid("receivedBy", "Enter the name of the person at the branch who received the parcel.");
  }
  if (failureReason === "OTHER" && (!note || note.length < 3)) invalid("note", "Describe what went wrong.");

  // 2. The parcel is yours (404). 3. The task is open, the step is allowed, the parcel can move (409).
  const found = stepFor(parcelId);
  const parcel = parcelOf(parcelId);
  if (taskClosed(found.task)) fail(409, "ASSIGNMENT_CLOSED");
  const target = status as CourierTargetStatus;
  if (!stepStatuses(found.task.type, found.item.outcome, found.closed).includes(target)) {
    fail(409, "TASK_STEP_NOT_ALLOWED");
  }
  if (!parcelCanMoveTo(parcel.status, target) || !atTheRightBranch(target, found.task.originBranch, parcel.currentBranch)) {
    fail(409, "INVALID_STATUS_TRANSITION");
  }

  // DELIVERED attaches the proof photo: it must be this parcel's and not attached yet (as the backend checks).
  let photo: PreviewPhoto | undefined;
  if (target === "DELIVERED") {
    photo = photos.get(body.proofPhotoId as string);
    if (!photo || photo.parcelId !== parcelId || photo.attached) invalid("proofPhotoId", "Add the photo again.");
  }

  // Delivery changes the parcel; dispatch records the outcome; both together.
  const at = new Date().toISOString();
  const branch = target === "AT_BRANCH" ? handOverBranch(found.task.type, found.task.originBranch, found.task.destinationBranch) : null;
  parcel.status = target;
  parcel.currentBranch = branch;
  parcel.updatedAt = at;
  if (target === "FAILED") parcel.failureReason = failureReason ?? null;
  if (target === "DELIVERED" && photo) {
    parcel.proofRecipientName = recipientName;
    parcel.proofPhotoUrl = photo.url;
    photo.attached = true;
  }
  parcel.history.push({ status: target, branch, failureReason: target === "FAILED" ? (failureReason ?? null) : null, occurredAt: at });
  record(found, outcomeFor(found.task.type, target), target === "AT_BRANCH" ? { receivedBy } : {}, at);

  return detailView(parcel, step(found.task, found.item));
}

function unableToCollect(parcelId: string, body: Record<string, unknown>): CourierDeliveryDetail {
  const problem = body.problem as TaskProblem;
  if (!PROBLEMS.includes(problem)) invalid("problem", "Select why you couldn't take the parcel.");
  const note = text(body.note);
  if (note && note.length > 500) invalid("note", "Keep the note under 500 characters.");
  if (problem === "OTHER" && (!note || note.length < 3)) invalid("note", "Describe what went wrong.");

  const found = stepFor(parcelId);
  const parcel = parcelOf(parcelId);
  if (taskClosed(found.task)) fail(409, "ASSIGNMENT_CLOSED");
  if (!canMarkUnableToCollect(found.task.type, found.item.outcome, found.closed)) fail(409, "TASK_STEP_NOT_ALLOWED");

  // NOT_COLLECTED (pickup) or NOT_LOADED (delivery); the parcel's own status doesn't change.
  record(found, unableToCollectOutcome(found.task.type), { problem }, new Date().toISOString());
  return detailView(parcel, step(found.task, found.item));
}

/**
 * POST .../{parcelId}/proof in preview: the photo stays in this browser (a local object URL); nothing is uploaded. A
 * file whose name starts with "fail" simulates the image storage being down (503), to try the retry.
 */
function uploadProof(parcelId: string, body: unknown): ProofUpload {
  const file = body instanceof FormData ? body.get("file") : null;
  const blob = file instanceof Blob ? file : null;
  const problem = proofFileError(blob);
  if (problem) invalid("file", problem);

  const found = stepFor(parcelId);
  const parcel = parcelOf(parcelId);
  if (taskClosed(found.task)) fail(409, "ASSIGNMENT_CLOSED");
  if (found.task.type !== "DELIVERY" || !stepStatuses(found.task.type, found.item.outcome, found.closed).includes("DELIVERED")) {
    fail(409, "TASK_STEP_NOT_ALLOWED");
  }
  if (!parcelCanMoveTo(parcel.status, "DELIVERED")) fail(409, "INVALID_STATUS_TRANSITION");
  const name = blob instanceof File ? blob.name : "";
  if (name.toLowerCase().startsWith("fail")) fail(503, "SERVICE_UNAVAILABLE");

  const proofPhotoId = crypto.randomUUID();
  photos.set(proofPhotoId, { parcelId, url: URL.createObjectURL(blob!), attached: false });
  return {
    proofPhotoId,
    contentType: blob!.type as ProofUpload["contentType"],
    sizeBytes: blob!.size,
    uploadedAt: new Date().toISOString(),
  };
}

// ---- Routing ----

const DELIVERY = /^\/courier\/deliveries\/([^/]+)$/;
const STATUS = /^\/courier\/deliveries\/([^/]+)\/status$/;
const UNABLE = /^\/courier\/deliveries\/([^/]+)\/unable-to-collect$/;
const PROOF = /^\/courier\/deliveries\/([^/]+)\/proof$/;
const HISTORY_ENTRY = /^\/courier\/deliveries\/([^/]+)\/history\/([^/]+)$/;

/** Waits `delayMs`; stops when the call is aborted. */
function pause(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

function route(path: string, method: string, options: RequestOptions): unknown {
  const body = (options.body ?? {}) as Record<string, unknown>;
  const id = (match: RegExpMatchArray) => decodeURIComponent(match[1]);
  let match: RegExpMatchArray | null;

  if (method === "GET") {
    if (path === "/courier/deliveries/today") return today();
    if (path === "/courier/deliveries/history") return history(options.query);
    if ((match = path.match(DELIVERY))) return detail(id(match));
    if ((match = path.match(HISTORY_ENTRY))) return historyEntry(id(match), decodeURIComponent(match[2]));
  }
  if (method === "POST") {
    if ((match = path.match(PROOF))) return uploadProof(id(match), options.body);
    if ((match = path.match(STATUS))) return changeStatus(id(match), body);
    if ((match = path.match(UNABLE))) return unableToCollect(id(match), body);
  }
  return notFound();
}

/**
 * Same signature as apiFetch, for the courier endpoints only. Answers are copies, so a screen can never change the
 * stored sample by accident.
 */
export async function courierPreviewFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  await pause(options.signal);
  return structuredClone(route(path, options.method ?? "GET", options)) as T;
}
