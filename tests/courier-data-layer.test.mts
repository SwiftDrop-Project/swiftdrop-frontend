import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * The courier data layer (src/features/courier: api.ts, schemas.ts, lib/errors.ts, lib/labels.ts) against the backend
 * contract (../swiftdrop-backend/API.md "Courier", courier/internal/dto/*.java). fetch is replaced, so no server is
 * needed: the tests check the URL, method, body and credentials of every call, how answers are checked, and how errors
 * are read.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.join(path.resolve(__dirname, ".."), "src");
const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map<string, { exports: Record<string, unknown> }>();

/** Loads a src/ TypeScript module (same approach as routing-and-navigation.test.mts). */
function loadTsModule<T>(specifier: string, fromDir = SRC_ROOT): T {
  let base: string | null = null;
  if (specifier.startsWith("@/")) base = path.join(SRC_ROOT, specifier.slice(2));
  else if (specifier.startsWith("./") || specifier.startsWith("../")) base = path.resolve(fromDir, specifier);
  const targetPath = base
    ? [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(
        (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
      )
    : undefined;
  if (!targetPath) return nodeRequire(specifier) as T;

  const cached = moduleCache.get(targetPath);
  if (cached) return cached.exports as T;
  const { outputText } = ts.transpileModule(fs.readFileSync(targetPath, "utf8"), {
    fileName: targetPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const mod = { exports: {} as Record<string, unknown> };
  moduleCache.set(targetPath, mod);
  const dirname = path.dirname(targetPath);
  const run = vm.runInThisContext(`(function (exports, require, module, __filename, __dirname) { ${outputText}\n})`, {
    filename: targetPath,
  }) as (e: object, r: (id: string) => unknown, m: object, f: string, d: string) => void;
  run(mod.exports, (child) => loadTsModule(child, dirname), mod, targetPath, dirname);
  return mod.exports as T;
}

type ApiModule = typeof import("../src/features/courier/api");
type SchemasModule = typeof import("../src/features/courier/schemas");
type ErrorsModule = typeof import("../src/features/courier/lib/errors");
type LabelsModule = typeof import("../src/features/courier/lib/labels");
type ClientModule = typeof import("../src/lib/api/client");

const { courierApi } = loadTsModule<ApiModule>("@/features/courier/api");
const schemas = loadTsModule<SchemasModule>("@/features/courier/schemas");
const errors = loadTsModule<ErrorsModule>("@/features/courier/lib/errors");
const labels = loadTsModule<LabelsModule>("@/features/courier/lib/labels");
const { ApiError } = loadTsModule<ClientModule>("@/lib/api/client");

// ---- Answers shaped like the backend's (API.md "Courier" examples) ----

const TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887001";
const PARCEL_ID = "ab598d39-d554-42f5-b609-6fa90f3a5357";
const OTHER_PARCEL_ID = "4d15dee6-ad98-4ac0-91a5-fb8d08659571";

const summary = {
  assignmentId: TASK_ID,
  type: "PICKUP",
  status: "IN_PROGRESS",
  originBranch: null,
  destinationBranch: "GAMPAHA",
  scheduledFor: "2026-11-09",
  note: "Morning round around Delgoda. Hand everything over at the Gampaha branch.",
  assignedAt: "2026-11-09T02:30:00Z",
  completedAt: null,
  counts: { total: 2, open: 1, closed: 1, problems: 1 },
  canComplete: false,
};

const item = {
  parcelId: PARCEL_ID,
  trackingNumber: "SD2611060001",
  sequence: 1,
  parcelStatus: "CREATED",
  outcome: "PENDING",
  allowedOutcomes: ["COLLECTED", "NOT_COLLECTED"],
  readyForHandover: false,
  contact: { name: "Delgoda Spice Traders", phone: "+94760000101", address: "14 Kandy Road", city: "Delgoda", district: "GAMPAHA" },
  from: { city: "Delgoda", district: "GAMPAHA" },
  to: { city: "Deniyaya", district: "MATARA" },
  weightKg: 1.2,
  codAmount: null,
  instructions: null,
  problem: null,
  failureReason: null,
  recipientName: null,
  receivedBy: null,
  note: null,
  // Java Instants can carry fractions of a second.
  updatedAt: "2026-11-09T02:30:00.123456Z",
};

const detail = { ...summary, items: [item] };

const parcel = {
  parcelId: PARCEL_ID,
  trackingNumber: "SD2611060001",
  status: "AT_BRANCH",
  currentBranch: "GAMPAHA",
  from: { city: "Delgoda", district: "GAMPAHA" },
  to: { city: "Deniyaya", district: "MATARA" },
  myItems: [{ assignmentId: TASK_ID, type: "PICKUP", outcome: "HANDED_OVER" }],
  contact: null,
  history: [
    { status: "AT_BRANCH", branch: "GAMPAHA", failureReason: null, occurredAt: "2026-11-09T05:10:00Z" },
    { status: "PICKED_UP", branch: null, failureReason: null, occurredAt: "2026-11-09T03:00:00Z" },
    { status: "CREATED", branch: null, failureReason: null, occurredAt: "2026-11-09T01:30:00Z" },
  ],
};

// ---- A fake fetch that records the request and answers with one response ----

interface Call {
  url: URL;
  method: string;
  credentials: RequestCredentials | undefined;
  headers: Record<string, string>;
  body: unknown;
}

process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";

function answer(status: number, body: unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    calls.push({
      url: new URL(String(input)),
      method: init.method ?? "GET",
      credentials: init.credentials,
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

function apiError(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  return answer(status, { status, code, message, ...(fieldErrors ? { fieldErrors } : {}) });
}

// ---- Endpoints ----

test("today: GET /courier/assignments/today with the cookie, answer checked", async () => {
  const calls = answer(200, { date: "2026-11-09", open: 1, completedToday: 0, assignments: [summary], extra: "dropped" });
  const today = await courierApi.today();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.href, "http://api.test/api/v1/courier/assignments/today");
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].credentials, "include");
  assert.equal(today.assignments[0].scheduledFor, "2026-11-09");
  assert.equal(today.assignments[0].destinationBranch, "GAMPAHA");
  assert.ok(!("extra" in today), "unknown fields are dropped");
});

test("history: page, size and a trimmed tracking number; an empty one is left out", async () => {
  const page = { content: [{ ...summary, status: "COMPLETED", completedAt: "2026-11-09T06:00:00Z", canComplete: false }], page: 0, size: 20, totalElements: 1, totalPages: 1 };
  let calls = answer(200, page);
  const result = await courierApi.history({ trackingNumber: "  sd 2611 0600 01 " });
  assert.equal(calls[0].url.pathname, "/api/v1/courier/assignments/history");
  assert.equal(calls[0].url.searchParams.get("page"), "0");
  assert.equal(calls[0].url.searchParams.get("size"), "20");
  assert.equal(calls[0].url.searchParams.get("trackingNumber"), "sd 2611 0600 01");
  assert.equal(result.content[0].status, "COMPLETED");

  calls = answer(200, { ...page, content: [] });
  await courierApi.history({ page: 2, size: 50, trackingNumber: "   " });
  assert.equal(calls[0].url.searchParams.get("page"), "2");
  assert.equal(calls[0].url.searchParams.get("size"), "50");
  assert.equal(calls[0].url.searchParams.has("trackingNumber"), false);
});

test("task: GET /courier/assignments/{id}, the id encoded", async () => {
  const calls = answer(200, detail);
  const task = await courierApi.task(TASK_ID);
  assert.equal(calls[0].url.pathname, `/api/v1/courier/assignments/${TASK_ID}`);
  assert.equal(task.items[0].trackingNumber, "SD2611060001");
  assert.deepEqual(task.items[0].allowedOutcomes, ["COLLECTED", "NOT_COLLECTED"]);

  const odd = answer(200, detail);
  await courierApi.task("a/b?c");
  assert.equal(odd[0].url.pathname, "/api/v1/courier/assignments/a%2Fb%3Fc");
});

test("recordOutcome: POST .../items/{parcelId}/outcome with only the outcome's own fields", async () => {
  const calls = answer(200, { ...detail, items: [{ ...item, outcome: "FAILED", failureReason: "RECIPIENT_UNAVAILABLE" }] });
  const body = schemas.failedRequest({ failureReason: "RECIPIENT_UNAVAILABLE", note: "" });
  const updated = await courierApi.recordOutcome(TASK_ID, PARCEL_ID, body);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url.pathname, `/api/v1/courier/assignments/${TASK_ID}/items/${PARCEL_ID}/outcome`);
  assert.equal(calls[0].headers["Content-Type"], "application/json");
  assert.deepEqual(calls[0].body, { outcome: "FAILED", failureReason: "RECIPIENT_UNAVAILABLE" });
  assert.equal(updated.items[0].outcome, "FAILED");
});

test("handover: POST .../handover with the parcels and who took them", async () => {
  const calls = answer(200, detail);
  await courierApi.handover(TASK_ID, schemas.handoverRequest({ parcelIds: [PARCEL_ID, OTHER_PARCEL_ID], receivedBy: "S. Silva", note: "Counter 2" }));
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url.pathname, `/api/v1/courier/assignments/${TASK_ID}/handover`);
  assert.deepEqual(calls[0].body, { parcelIds: [PARCEL_ID, OTHER_PARCEL_ID], receivedBy: "S. Silva", note: "Counter 2" });
});

test("complete: POST .../complete without a body, answers the task summary", async () => {
  const calls = answer(200, { ...summary, status: "COMPLETED", completedAt: "2026-11-09T07:00:00Z" });
  const done = await courierApi.complete(TASK_ID);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url.pathname, `/api/v1/courier/assignments/${TASK_ID}/complete`);
  assert.equal(calls[0].body, undefined);
  assert.equal(calls[0].headers["Content-Type"], undefined);
  assert.equal(done.status, "COMPLETED");
});

test("parcel: GET /courier/parcels/{parcelId}, AT_BRANCH with its branch and history", async () => {
  const calls = answer(200, parcel);
  const result = await courierApi.parcel(PARCEL_ID);
  assert.equal(calls[0].url.pathname, `/api/v1/courier/parcels/${PARCEL_ID}`);
  assert.equal(result.status, "AT_BRANCH");
  assert.equal(result.currentBranch, "GAMPAHA");
  assert.equal(result.history[0].branch, "GAMPAHA");
  assert.deepEqual(result.myItems, [{ assignmentId: TASK_ID, type: "PICKUP", outcome: "HANDED_OVER" }]);
});

test("an answer that doesn't match the contract throws CourierResponseError, without the values", async () => {
  answer(200, { ...detail, items: [{ ...item, parcelStatus: "SHIPPED", contact: { ...item.contact, phone: undefined } }] });
  await assert.rejects(courierApi.task(TASK_ID), (error: unknown) => {
    assert.ok(error instanceof errors.CourierResponseError);
    assert.equal(error.endpoint, `/courier/assignments/${TASK_ID}`);
    const paths = error.issues.map((issue) => issue.path);
    assert.ok(paths.includes("items.0.parcelStatus"));
    assert.ok(paths.includes("items.0.contact.phone"));
    assert.ok(!JSON.stringify(error.issues).includes("SHIPPED"), "values are not copied into the error");
    assert.equal(errors.describeCourierError(error).kind, "other");
    return true;
  });
});

// ---- Errors ----

test("409 ASSIGNMENT_CHANGED from a write is a stale task: reload, with the API's message", async () => {
  apiError(409, "ASSIGNMENT_CHANGED", "This task was just changed by someone else. Refresh and try again.");
  await assert.rejects(courierApi.recordOutcome(TASK_ID, PARCEL_ID, { outcome: "COLLECTED" }), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    const described = errors.describeCourierError(error);
    assert.equal(described.kind, "stale");
    assert.equal(described.reload, true);
    assert.equal(described.message, "This task was just changed by someone else. Refresh and try again.");
    return true;
  });
});

test("every courier error code is read the way API.md describes", () => {
  const read = (status: number, code: string, options?: { loadingById?: boolean }) =>
    errors.describeCourierError(new ApiError({ status, code: code as never, message: `msg ${code}` }), options);

  assert.deepEqual(
    ["TASK_STEP_NOT_ALLOWED", "ASSIGNMENT_CHANGED", "INVALID_STATUS_TRANSITION"].map((code) => read(409, code).kind),
    ["stale", "stale", "stale"],
  );
  assert.equal(read(409, "ASSIGNMENT_CLOSED").kind, "closed");
  assert.equal(read(409, "ASSIGNMENT_CLOSED").reload, true);
  assert.equal(read(409, "ASSIGNMENT_NOT_FINISHED").kind, "not-finished");
  assert.equal(read(404, "NOT_FOUND").kind, "not-found");
  assert.equal(read(404, "NOT_FOUND").reload, false);
  assert.equal(read(400, "VALIDATION_FAILED", { loadingById: true }).kind, "not-found");
  assert.equal(read(403, "FORBIDDEN").kind, "other");
  assert.equal(read(0, "NETWORK_ERROR").message, "msg NETWORK_ERROR");
  assert.equal(errors.describeCourierError(new Error("boom")).message, errors.UNKNOWN_ERROR);

  const validation = errors.describeCourierError(
    new ApiError({ status: 400, code: "VALIDATION_FAILED", message: "Some fields need attention.", fieldErrors: { receivedBy: "Enter the name of the person at the branch who received the parcels." } }),
  );
  assert.equal(validation.kind, "validation");
  assert.equal(validation.fieldErrors.receivedBy, "Enter the name of the person at the branch who received the parcels.");
});

// ---- Request schemas: the API's rules and messages ----

function firstMessage(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, field: string) {
  assert.equal(result.success, false);
  return result.error!.issues.find((issue) => issue.path.join(".") === field)?.message;
}

test("delivered: recipient name trimmed, 2-100 characters; an empty note is left out of the request", () => {
  const ok = schemas.deliveredSchema.parse({ recipientName: "  Nimal Perera ", note: "   " });
  assert.deepEqual(schemas.deliveredRequest(ok), { outcome: "DELIVERED", recipientName: "Nimal Perera", note: undefined });
  assert.equal(firstMessage(schemas.deliveredSchema.safeParse({ recipientName: " N ", note: "" }), "recipientName"), "Enter the name of the person who received the parcel.");
  assert.equal(firstMessage(schemas.deliveredSchema.safeParse({ recipientName: "N".repeat(101), note: "" }), "recipientName"), "Enter the name of the person who received the parcel.");
  assert.equal(firstMessage(schemas.deliveredSchema.safeParse({ recipientName: "Nimal", note: "x".repeat(501) }), "note"), "Keep the note under 500 characters.");
});

test("failed: a reason is required, and OTHER needs a note of 3 characters or more", () => {
  assert.equal(firstMessage(schemas.failedSchema.safeParse({ failureReason: "", note: "" }), "failureReason"), "Select why the delivery failed.");
  assert.equal(firstMessage(schemas.failedSchema.safeParse({ failureReason: "OTHER", note: " ab " }), "note"), "Describe what went wrong.");
  const other = schemas.failedSchema.parse({ failureReason: "OTHER", note: " Gate locked " });
  assert.deepEqual(schemas.failedRequest(other), { outcome: "FAILED", failureReason: "OTHER", note: "Gate locked" });
});

test("not collected / not loaded: a problem is required, and OTHER needs a note", () => {
  assert.equal(firstMessage(schemas.notTakenSchema.safeParse({ problem: "", note: "" }), "problem"), "Select why you couldn't take the parcel.");
  assert.equal(firstMessage(schemas.notTakenSchema.safeParse({ problem: "OTHER", note: "" }), "note"), "Describe what went wrong.");
  const values = schemas.notTakenSchema.parse({ problem: "PARCEL_NOT_READY", note: "" });
  assert.deepEqual(schemas.notTakenRequest("NOT_LOADED", values), { outcome: "NOT_LOADED", problem: "PARCEL_NOT_READY", note: undefined });
});

test("collected / loaded: only an optional note", () => {
  assert.deepEqual(schemas.outcomeStepRequest("LOADED", schemas.outcomeStepSchema.parse({ note: " Two boxes " })), { outcome: "LOADED", note: "Two boxes" });
});

test("handover: 1-100 different parcels and who received them", () => {
  assert.equal(firstMessage(schemas.handoverSchema.safeParse({ parcelIds: [], receivedBy: "S. Silva", note: "" }), "parcelIds"), "Select at least one parcel.");
  const many = Array.from({ length: 101 }, (_, i) => `parcel-${i}`);
  assert.equal(firstMessage(schemas.handoverSchema.safeParse({ parcelIds: many, receivedBy: "S. Silva", note: "" }), "parcelIds"), "Hand over at most 100 parcels at a time.");
  assert.equal(firstMessage(schemas.handoverSchema.safeParse({ parcelIds: [PARCEL_ID, PARCEL_ID], receivedBy: "S. Silva", note: "" }), "parcelIds"), "Select each parcel only once.");
  assert.equal(firstMessage(schemas.handoverSchema.safeParse({ parcelIds: [PARCEL_ID], receivedBy: " S ", note: "" }), "receivedBy"), "Enter the name of the person at the branch who received the parcels.");
});

test("history paging: page 0 or more, size 1-100", () => {
  assert.ok(schemas.taskHistoryQuerySchema.safeParse({ page: 0, size: 100 }).success);
  assert.equal(firstMessage(schemas.taskHistoryQuerySchema.safeParse({ page: -1, size: 20 }), "page"), "Use a page number of 0 or more.");
  assert.equal(firstMessage(schemas.taskHistoryQuerySchema.safeParse({ page: 0, size: 101 }), "size"), "Use a page size from 1 to 100.");
  assert.equal(firstMessage(schemas.taskHistoryQuerySchema.safeParse({ page: 0, size: 0 }), "size"), "Use a page size from 1 to 100.");
});

// ---- Response schemas and words ----

test("response schemas accept the API.md examples, including a later-day task and a closed one", () => {
  assert.ok(schemas.courierTaskDetailSchema.safeParse(detail).success);
  assert.ok(schemas.courierParcelDetailSchema.safeParse(parcel).success);
  assert.ok(schemas.courierTaskSummarySchema.safeParse({ ...summary, scheduledFor: "2026-11-12" }).success);
  assert.ok(schemas.courierTaskSummarySchema.safeParse({ ...summary, type: "TRANSFER", originBranch: "GAMPAHA", destinationBranch: "MATARA" }).success);
  assert.ok(schemas.courierTaskItemSchema.safeParse({ ...item, codAmount: 2500, instructions: "Call first", contact: null }).success);
  assert.ok(!schemas.courierTaskSummarySchema.safeParse({ ...summary, status: "DONE" }).success);
  assert.ok(!schemas.courierTaskSummarySchema.safeParse({ ...summary, scheduledFor: "09/11/2026" }).success);
});

test("enums and words follow the backend's values and order", () => {
  assert.deepEqual(labels.ITEM_OUTCOMES, ["PENDING", "COLLECTED", "LOADED", "HANDED_OVER", "DELIVERED", "FAILED", "RETURNED", "NOT_COLLECTED", "NOT_LOADED"]);
  assert.deepEqual(labels.TASK_PROBLEM_VALUES, ["SENDER_UNAVAILABLE", "PARCEL_NOT_READY", "PARCEL_MISSING", "PARCEL_DAMAGED", "ADDRESS_UNREACHABLE", "OTHER"]);
  assert.deepEqual(labels.FAILURE_REASON_VALUES, ["RECIPIENT_UNAVAILABLE", "WRONG_ADDRESS", "RECIPIENT_REFUSED", "ADDRESS_UNREACHABLE", "PARCEL_DAMAGED", "OTHER"]);
  assert.deepEqual(labels.ASSIGNMENT_TYPES, ["PICKUP", "TRANSFER", "DELIVERY"]);
  assert.deepEqual(labels.ASSIGNMENT_STATUSES, ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
  // Only outcomes the outcome endpoint accepts have a button; the handover has its own.
  assert.deepEqual(Object.keys(labels.OUTCOME_ACTION_LABEL).sort(), ["COLLECTED", "DELIVERED", "FAILED", "LOADED", "NOT_COLLECTED", "NOT_LOADED"]);
  assert.equal(labels.HANDOVER_ACTION_LABEL.DELIVERY, "Return to branch");
  assert.equal(labels.courierRoutes.task(TASK_ID), `/courier/tasks/${TASK_ID}`);
  assert.equal(labels.courierRoutes.parcel(PARCEL_ID), `/courier/parcels/${PARCEL_ID}`);
  assert.equal(labels.formatWeight(1.2), "1.2 kg");
});
