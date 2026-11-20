import { ApiError, type apiFetch } from "@/lib/api";
import type { ApiErrorCode, PageResponse } from "@/types";
import type {
  CourierParcelDetail,
  CourierTaskDetail,
  CourierTaskItem,
  CourierTasksToday,
  CourierTaskSummary,
  FailureReason,
  ItemOutcome,
  TaskProblem,
} from "../types";
import { colomboDay, createSampleStore, type PreviewItem, type PreviewStore, type PreviewTask } from "./data";
import { allowedOutcomes, canMoveTo, closes, handoverOutcome, isHandover, parcelMove, readyForHandover } from "./rules";

/*
 * PREVIEW ONLY. Answers the courier endpoints from the sample data in data.ts, in the browser's memory. It never
 * calls fetch: nothing reaches the backend or the database. api.ts uses it instead of apiFetch when preview mode is
 * on (preview/flag.ts), so every answer still goes through the same response schemas.
 */

type RequestOptions = NonNullable<Parameters<typeof apiFetch>[1]>;

let store: PreviewStore | null = null;
/** A short pause on every call, so loading states show as they would against a server. */
let delayMs = 250;

function data(): PreviewStore {
  store ??= createSampleStore();
  return store;
}

/** Starts again from the sample data (tests; a full page reload does the same in the browser). */
export function resetCourierPreview(now?: Date, options: { delayMs?: number } = {}): void {
  store = createSampleStore(now);
  if (options.delayMs !== undefined) delayMs = options.delayMs;
}

const MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  NOT_FOUND: "We couldn't find that.",
  VALIDATION_FAILED: "Check the highlighted fields.",
  TASK_STEP_NOT_ALLOWED: "This step isn't possible for this parcel now. Refresh to see your task.",
  ASSIGNMENT_CLOSED: "This task is already completed or was cancelled.",
  ASSIGNMENT_NOT_FINISHED: "Update every parcel in this task before you finish it.",
};

function fail(status: number, code: ApiErrorCode, fieldErrors?: Record<string, string>): never {
  throw new ApiError({ status, code, message: MESSAGES[code] ?? "Something went wrong.", fieldErrors });
}

const notFound = (): never => fail(404, "NOT_FOUND");
const invalid = (field: string, message: string): never => fail(400, "VALIDATION_FAILED", { [field]: message });

// ---- Views (the backend's courier DTOs) ----

const isClosed = (task: PreviewTask) => task.status === "COMPLETED" || task.status === "CANCELLED";
const closedAt = (task: PreviewTask) => task.completedAt ?? task.cancelledAt;

function summary(task: PreviewTask): CourierTaskSummary {
  const closed = task.items.filter((entry) => entry.closed).length;
  return {
    assignmentId: task.assignmentId,
    type: task.type,
    status: task.status,
    originBranch: task.originBranch,
    destinationBranch: task.destinationBranch,
    scheduledFor: task.scheduledFor,
    note: task.note,
    assignedAt: task.assignedAt,
    completedAt: task.completedAt,
    counts: {
      total: task.items.length,
      open: task.items.length - closed,
      closed,
      problems: task.items.filter((entry) => entry.problem !== null || entry.failureReason !== null).length,
    },
    canComplete: !isClosed(task) && task.items.length > 0 && task.items.every((entry) => entry.closed),
  };
}

function itemView(task: PreviewTask, entry: PreviewItem): CourierTaskItem {
  const parcel = data().parcels.get(entry.parcelId);
  if (!parcel) throw new Error(`Preview parcel ${entry.parcelId} is missing`);
  const delivery = task.type === "DELIVERY";
  const open = !entry.closed && !isClosed(task);
  const contact = task.type === "PICKUP" ? parcel.sender : delivery ? parcel.recipient : null;
  return {
    parcelId: parcel.id,
    trackingNumber: parcel.trackingNumber,
    sequence: entry.sequence,
    parcelStatus: parcel.status,
    outcome: entry.outcome,
    allowedOutcomes: allowedOutcomes(task, isClosed(task), entry.outcome),
    readyForHandover: readyForHandover(task, isClosed(task), entry.outcome),
    contact: open ? contact : null,
    from: { city: parcel.sender.city, district: parcel.sender.district },
    to: { city: parcel.recipient.city, district: parcel.recipient.district },
    weightKg: parcel.weightKg,
    codAmount: delivery ? parcel.codAmount : null,
    instructions: delivery ? parcel.instructions : null,
    problem: entry.problem,
    failureReason: entry.failureReason,
    recipientName: entry.recipientName,
    receivedBy: entry.receivedBy,
    note: entry.note,
    updatedAt: entry.updatedAt,
  };
}

function detail(task: PreviewTask): CourierTaskDetail {
  return {
    ...summary(task),
    items: [...task.items].sort((a, b) => a.sequence - b.sequence).map((entry) => itemView(task, entry)),
  };
}

/** 0 = in progress, 1 = assigned, 2 = closed (the backend's Today order). */
const group = (task: PreviewTask) => (isClosed(task) ? 2 : task.status === "IN_PROGRESS" ? 0 : 1);

function today(): CourierTasksToday {
  const date = colomboDay(new Date());
  const tasks = data()
    .tasks.filter((task) => !isClosed(task) || colomboDay(new Date(closedAt(task) ?? 0)) === date)
    .sort((a, b) => {
      if (group(a) !== group(b)) return group(a) - group(b);
      return group(a) === 2
        ? (closedAt(b) ?? "").localeCompare(closedAt(a) ?? "")
        : a.assignedAt.localeCompare(b.assignedAt);
    });
  return {
    date,
    open: tasks.filter((task) => !isClosed(task)).length,
    completedToday: tasks.filter((task) => task.status === "COMPLETED").length,
    assignments: tasks.map(summary),
  };
}

function history(query: RequestOptions["query"] = {}): PageResponse<CourierTaskSummary> {
  const page = Number(query.page ?? 0);
  const size = Number(query.size ?? 20);
  if (!Number.isInteger(page) || page < 0) invalid("page", "Use a page number of 0 or more.");
  if (!Number.isInteger(size) || size < 1 || size > 100) invalid("size", "Use a page size from 1 to 100.");

  const tracking = String(query.trackingNumber ?? "").replace(/\s+/g, "").toUpperCase();
  const parcel = tracking ? [...data().parcels.values()].find((entry) => entry.trackingNumber === tracking) : undefined;
  const closed =
    tracking && !parcel
      ? []
      : data()
          .tasks.filter((task) => isClosed(task))
          .filter((task) => !parcel || task.items.some((entry) => entry.parcelId === parcel.id))
          .sort((a, b) => (closedAt(b) ?? "").localeCompare(closedAt(a) ?? ""));
  return {
    content: closed.slice(page * size, page * size + size).map(summary),
    page,
    size,
    totalElements: closed.length,
    totalPages: Math.ceil(closed.length / size),
  };
}

function ownTask(assignmentId: string): PreviewTask {
  return data().tasks.find((task) => task.assignmentId === assignmentId) ?? notFound();
}

function ownItem(task: PreviewTask, parcelId: string): PreviewItem {
  return task.items.find((entry) => entry.parcelId === parcelId) ?? notFound();
}

function parcelDetail(parcelId: string): CourierParcelDetail {
  const parcel = data().parcels.get(parcelId);
  const mine = data()
    .tasks.flatMap((task) => task.items.filter((entry) => entry.parcelId === parcelId).map((entry) => ({ task, entry })))
    .sort((a, b) => b.task.assignedAt.localeCompare(a.task.assignedAt));
  if (!parcel || mine.length === 0) notFound();
  const open = mine.find(({ task, entry }) => !entry.closed && !isClosed(task) && task.type !== "TRANSFER");
  return {
    parcelId: parcel!.id,
    trackingNumber: parcel!.trackingNumber,
    status: parcel!.status,
    currentBranch: parcel!.status === "AT_BRANCH" ? parcel!.currentBranch : null,
    from: { city: parcel!.sender.city, district: parcel!.sender.district },
    to: { city: parcel!.recipient.city, district: parcel!.recipient.district },
    myItems: mine.map(({ task, entry }) => ({ assignmentId: task.assignmentId, type: task.type, outcome: entry.outcome })),
    contact: open ? (open.task.type === "PICKUP" ? parcel!.sender : parcel!.recipient) : null,
    history: [...parcel!.history].reverse(),
  };
}

// ---- Writes (the backend's checks, in its order) ----

const trimToNull = (value: unknown) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

/** Moves the parcel for this outcome and adds the history entry, as delivery would. */
function moveParcel(task: PreviewTask, parcelId: string, outcome: ItemOutcome, failureReason: FailureReason | null, now: string) {
  const move = parcelMove(task, outcome);
  const parcel = data().parcels.get(parcelId);
  if (!move || !parcel) return;
  parcel.status = move.status;
  parcel.currentBranch = move.status === "AT_BRANCH" ? move.branch : null;
  parcel.history.push({
    status: move.status,
    branch: move.status === "AT_BRANCH" ? move.branch : null,
    failureReason: move.status === "FAILED" ? failureReason : null,
    occurredAt: now,
  });
}

/** Records one item outcome, as dispatch would: the first one starts the task. */
function apply(task: PreviewTask, entry: PreviewItem, outcome: ItemOutcome, fields: Partial<PreviewItem>, now: string) {
  Object.assign(entry, fields, { outcome, updatedAt: now, closed: closes(task.type, outcome) });
  if (task.status === "ASSIGNED") task.status = "IN_PROGRESS";
}

function recordOutcome(assignmentId: string, parcelId: string, body: Record<string, unknown>): CourierTaskDetail {
  const outcome = body.outcome as ItemOutcome;
  const problem = (body.problem ?? null) as TaskProblem | null;
  const failureReason = (body.failureReason ?? null) as FailureReason | null;
  const note = trimToNull(body.note);
  const recipientName = trimToNull(body.recipientName);
  const notTaken = outcome === "NOT_COLLECTED" || outcome === "NOT_LOADED";

  if (!outcome || outcome === "PENDING") invalid("outcome", "Select what happened.");
  if (isHandover(outcome)) invalid("outcome", "Use Hand over for this step.");
  if (problem && !notTaken) invalid("problem", "Only when a parcel couldn't be collected or loaded.");
  if (recipientName && outcome !== "DELIVERED") invalid("recipientName", "Only for delivered parcels.");
  if (failureReason && outcome !== "FAILED") invalid("failureReason", "Only for failed deliveries.");
  if (notTaken && !problem) invalid("problem", "Select why you couldn't take the parcel.");
  if (outcome === "DELIVERED" && (!recipientName || recipientName.length < 2)) {
    invalid("recipientName", "Enter the name of the person who received the parcel.");
  }
  if (outcome === "FAILED" && !failureReason) invalid("failureReason", "Select why the delivery failed.");
  if ((problem === "OTHER" || failureReason === "OTHER") && (!note || note.length < 3)) {
    invalid("note", "Describe what went wrong.");
  }

  const task = ownTask(assignmentId);
  const entry = ownItem(task, parcelId);
  if (isClosed(task)) fail(409, "ASSIGNMENT_CLOSED");
  if (!canMoveTo(task.type, entry.outcome, outcome)) fail(409, "TASK_STEP_NOT_ALLOWED");

  const now = new Date().toISOString();
  moveParcel(task, parcelId, outcome, failureReason, now);
  apply(
    task,
    entry,
    outcome,
    {
      problem,
      // A RETURNED item keeps its failure reason; a new outcome sets its own.
      failureReason,
      note,
      recipientName,
    },
    now,
  );
  return detail(task);
}

function handover(assignmentId: string, body: Record<string, unknown>): CourierTaskDetail {
  const parcelIds = Array.isArray(body.parcelIds) ? (body.parcelIds as string[]) : [];
  if (parcelIds.length === 0) invalid("parcelIds", "Select at least one parcel.");
  if (new Set(parcelIds).size !== parcelIds.length) invalid("parcelIds", "Select each parcel only once.");
  const receivedBy = trimToNull(body.receivedBy);
  if (!receivedBy || receivedBy.length < 2) {
    invalid("receivedBy", "Enter the name of the person at the branch who received the parcels.");
  }
  const note = trimToNull(body.note);

  const task = ownTask(assignmentId);
  const entries = parcelIds.map((parcelId) => ownItem(task, parcelId));
  if (isClosed(task)) fail(409, "ASSIGNMENT_CLOSED");
  // All or nothing: check every parcel before changing any.
  if (entries.some((entry) => !readyForHandover(task, false, entry.outcome))) fail(409, "TASK_STEP_NOT_ALLOWED");

  const outcome = handoverOutcome(task.type);
  const now = new Date().toISOString();
  for (const entry of entries) {
    moveParcel(task, entry.parcelId, outcome, null, now);
    apply(task, entry, outcome, { note, receivedBy }, now);
  }
  return detail(task);
}

function complete(assignmentId: string): CourierTaskSummary {
  const task = ownTask(assignmentId);
  if (isClosed(task)) fail(409, "ASSIGNMENT_CLOSED");
  if (task.items.some((entry) => !entry.closed)) fail(409, "ASSIGNMENT_NOT_FINISHED");
  task.status = "COMPLETED";
  task.completedAt = new Date().toISOString();
  return summary(task);
}

// ---- The fetch replacement ----

const TASK = /^\/courier\/assignments\/([^/]+)$/;
const OUTCOME = /^\/courier\/assignments\/([^/]+)\/items\/([^/]+)\/outcome$/;
const HANDOVER = /^\/courier\/assignments\/([^/]+)\/handover$/;
const COMPLETE = /^\/courier\/assignments\/([^/]+)\/complete$/;
const PARCEL = /^\/courier\/parcels\/([^/]+)$/;

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
  const id = (match: RegExpMatchArray, index = 1) => decodeURIComponent(match[index]);
  let match: RegExpMatchArray | null;

  if (method === "GET") {
    if (path === "/courier/assignments/today") return today();
    if (path === "/courier/assignments/history") return history(options.query);
    if ((match = path.match(TASK))) return detail(ownTask(id(match)));
    if ((match = path.match(PARCEL))) return parcelDetail(id(match));
  }
  if (method === "POST") {
    if ((match = path.match(OUTCOME))) return recordOutcome(id(match), id(match, 2), body);
    if ((match = path.match(HANDOVER))) return handover(id(match), body);
    if ((match = path.match(COMPLETE))) return complete(id(match));
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
