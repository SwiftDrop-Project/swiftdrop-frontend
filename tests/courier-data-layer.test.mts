import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * The courier data layer (src/features/courier: api.ts, schemas.ts, lib/errors.ts) against the unified backend
 * contract (../swiftdrop-backend/API.md "Courier", /courier/deliveries/*). fetch is replaced, so no server is needed:
 * the tests check the URL, method, body and credentials of every call, how answers are checked, and how errors are read.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");
const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map<string, { exports: Record<string, unknown> }>();

/** Loads a src/ TypeScript module, transpiled to CommonJS; one instance per file for the whole test run. */
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

type Delivery = import("../src/features/courier/types").CourierDelivery;
type DeliveryDetail = import("../src/features/courier/types").CourierDeliveryDetail;
type Task = import("../src/features/courier/types").CourierTask;

const TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887001";
const PARCEL_ID = "ab598d39-d554-42f5-b609-6fa90f3a5357";

const SENDER = {
  name: "Delgoda Spice Traders",
  phone: "+94760000101",
  address: "14 Kandy Road",
  city: "Delgoda",
  district: "GAMPAHA",
};

const RECIPIENT = {
  name: "Nimal Perera",
  phone: "+94771234567",
  address: "45 Peradeniya Road",
  city: "Kandy",
  district: "KANDY",
};

/** An open pickup step (PENDING): the sender is sent, PICKED_UP or Unable to Collect. */
function pickup(overrides: Partial<Delivery> = {}, task: Partial<Task> = {}): Delivery {
  return {
    parcelId: PARCEL_ID,
    trackingNumber: "SD2611004817",
    status: "CREATED",
    stop: "PICKUP",
    pickup: SENDER,
    recipient: null,
    from: { city: "Delgoda", district: "GAMPAHA" },
    to: { city: "Kandy", district: "KANDY" },
    weightKg: 1.2,
    codAmount: null,
    deliveryFee: null,
    instructions: null,
    assignedAt: "2026-11-05T02:30:00Z",
    // Java Instants can carry fractions of a second.
    updatedAt: "2026-11-05T02:30:00.123456Z",
    nextStatuses: ["PICKED_UP"],
    canMarkUnableToCollect: true,
    completed: false,
    completedAt: null,
    proof: null,
    task: {
      assignmentId: TASK_ID,
      type: "PICKUP",
      status: "ASSIGNED",
      outcome: "PENDING",
      branch: "GAMPAHA",
      problem: null,
      receivedBy: null,
      ...task,
    },
    ...overrides,
  };
}

/** An open delivery step, out for delivery (LOADED): the recipient is sent, DELIVERED or FAILED. */
function delivery(overrides: Partial<Delivery> = {}, task: Partial<Task> = {}): Delivery {
  return {
    parcelId: PARCEL_ID,
    trackingNumber: "SD2611004817",
    status: "OUT_FOR_DELIVERY",
    stop: "DELIVERY",
    pickup: null,
    recipient: RECIPIENT,
    from: { city: "Nugegoda", district: "COLOMBO" },
    to: { city: "Kandy", district: "KANDY" },
    weightKg: 1.2,
    codAmount: 2450,
    deliveryFee: null,
    instructions: "Call before you arrive.",
    assignedAt: "2026-11-05T02:30:00Z",
    updatedAt: "2026-11-05T05:10:00Z",
    nextStatuses: ["DELIVERED", "FAILED"],
    canMarkUnableToCollect: false,
    completed: false,
    completedAt: null,
    proof: null,
    task: {
      assignmentId: TASK_ID,
      type: "DELIVERY",
      status: "IN_PROGRESS",
      outcome: "LOADED",
      branch: "COLOMBO",
      problem: null,
      receivedBy: null,
      ...task,
    },
    ...overrides,
  };
}

/** The detail fields on top of a list entry (GET /courier/deliveries/{parcelId} and every write's answer). */
function detail(base: Delivery, overrides: Partial<DeliveryDetail> = {}): DeliveryDetail {
  return {
    ...base,
    history: [
      { status: base.status, branch: null, failureReason: null, occurredAt: "2026-11-05T05:10:00Z" },
      { status: "AT_BRANCH", branch: "COLOMBO", failureReason: null, occurredAt: "2026-11-05T03:00:00Z" },
    ],
    failureReason: null,
    ...overrides,
  };
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

interface Call {
  url: URL;
  method: string;
  credentials: RequestCredentials | undefined;
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
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

function apiError(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  return answer(status, { status, code, message, ...(fieldErrors ? { fieldErrors } : {}) });
}

const BASE = "http://api.test/api/v1/courier/deliveries";

// ---- Endpoints ----

test("today: GET /courier/deliveries/today with the cookie; toDo, done and parcels checked", async () => {
  const calls = answer(200, { date: "2026-11-05", toDo: 1, done: 0, items: [pickup()], extra: "dropped" });
  const today = await courierApi.today();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.href, `${BASE}/today`);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].credentials, "include");
  assert.equal(today.toDo, 1);
  assert.equal(today.items[0].task.status, "ASSIGNED");
  assert.deepEqual(today.items[0].nextStatuses, ["PICKED_UP"]);
  assert.equal(today.items[0].canMarkUnableToCollect, true);
  assert.ok(!("extra" in today), "unknown fields are dropped");
});

test("history: page, size and a trimmed tracking number; an empty one is left out", async () => {
  const page = { content: [delivery({ completed: true, completedAt: "2026-11-05T06:00:00Z", nextStatuses: [], recipient: null })], page: 1, size: 20, totalElements: 21, totalPages: 2 };
  let calls = answer(200, page);
  const result = await courierApi.history({ page: 1, size: 20, trackingNumber: "  SD 2611 0048 17 " });
  assert.equal(calls[0].url.pathname, "/api/v1/courier/deliveries/history");
  assert.equal(calls[0].url.searchParams.get("page"), "1");
  assert.equal(calls[0].url.searchParams.get("size"), "20");
  assert.equal(calls[0].url.searchParams.get("trackingNumber"), "SD 2611 0048 17");
  assert.equal(result.content[0].completed, true);

  calls = answer(200, page);
  await courierApi.history({ trackingNumber: "   " });
  assert.equal(calls[0].url.searchParams.has("trackingNumber"), false);
  assert.equal(calls[0].url.searchParams.get("page"), "0");
});

test("delivery: GET /courier/deliveries/{parcelId}, the id URL-encoded, with history and proof", async () => {
  const calls = answer(200, detail(delivery(), { proof: null }));
  const parcel = await courierApi.delivery(PARCEL_ID);
  assert.equal(calls[0].url.href, `${BASE}/${PARCEL_ID}`);
  assert.equal(parcel.history.length, 2);

  answer(200, detail(delivery()));
  const encodedCalls = answer(200, detail(delivery()));
  await courierApi.delivery("a/b").catch(() => undefined);
  assert.equal(encodedCalls[0].url.pathname, "/api/v1/courier/deliveries/a%2Fb");
});

test("changeStatus: POST /courier/deliveries/{parcelId}/status with only that status's fields", async () => {
  const calls = answer(200, detail(pickup({ status: "AT_BRANCH", completed: true, completedAt: "2026-11-05T06:00:00Z", nextStatuses: [], canMarkUnableToCollect: false, pickup: null }, { outcome: "HANDED_OVER", status: "COMPLETED", receivedBy: "S. Silva" })));
  const after = await courierApi.changeStatus(PARCEL_ID, { status: "AT_BRANCH", receivedBy: "S. Silva" });
  assert.equal(calls[0].url.href, `${BASE}/${PARCEL_ID}/status`);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].credentials, "include");
  assert.deepEqual(calls[0].body, { status: "AT_BRANCH", receivedBy: "S. Silva" });
  assert.equal(after.completed, true, "the answer says whether the parcel is now completed");
  assert.equal(after.task.status, "COMPLETED", "the task completes by itself after its last parcel");
});

test("unableToCollect: POST /courier/deliveries/{parcelId}/unable-to-collect with { problem, note }", async () => {
  const calls = answer(200, detail(pickup({ completed: true, completedAt: "2026-11-05T06:00:00Z", nextStatuses: [], canMarkUnableToCollect: false, pickup: null }, { outcome: "NOT_COLLECTED", problem: "OTHER" })));
  const after = await courierApi.unableToCollect(PARCEL_ID, { problem: "OTHER", note: "Gate locked" });
  assert.equal(calls[0].url.href, `${BASE}/${PARCEL_ID}/unable-to-collect`);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(calls[0].body, { problem: "OTHER", note: "Gate locked" });
  assert.equal(after.task.outcome, "NOT_COLLECTED", "the backend picks NOT_COLLECTED or NOT_LOADED");
});

test("an answer that doesn't match the contract throws CourierResponseError naming fields, never values", async () => {
  answer(200, { date: "2026-11-05", toDo: 1, done: 0, items: [{ ...pickup(), completed: "yes", pickup: { name: 42 } }] });
  await assert.rejects(courierApi.today(), (error: unknown) => {
    assert.ok(error instanceof errors.CourierResponseError);
    assert.equal(error.endpoint, "/courier/deliveries/today");
    const paths = error.issues.map((issue) => issue.path);
    assert.ok(paths.includes("items.0.completed"));
    assert.ok(!JSON.stringify(error.issues).includes("Delgoda"), "no personal data in the error");
    return true;
  });
});

test("nullable and restricted contacts are accepted: no contact, no from/to, a cancelled task", async () => {
  const parsed = schemas.courierDeliverySchema.parse(
    pickup({ pickup: null, recipient: null, from: null, to: null, nextStatuses: [], canMarkUnableToCollect: false }, { status: "CANCELLED" }),
  );
  assert.equal(parsed.pickup, null);
  assert.equal(parsed.from, null);
  assert.equal(parsed.task.status, "CANCELLED");
  assert.equal(parsed.completed, false);
});

test("compatibility: an answer holding a TRANSFER still parses (the screens filter it, nothing fails)", async () => {
  const transfer = delivery({ recipient: null, nextStatuses: ["IN_TRANSIT"], status: "AT_BRANCH" }, { type: "TRANSFER", outcome: "PENDING" });
  answer(200, { date: "2026-11-05", toDo: 2, done: 0, items: [pickup(), transfer] });
  const today = await courierApi.today();
  assert.equal(today.items.length, 2);
  assert.equal(today.items[1].task.type, "TRANSFER");
  assert.ok(labels.isCourierTaskType("PICKUP") && labels.isCourierTaskType("DELIVERY"));
  assert.equal(labels.isCourierTaskType("TRANSFER"), false);
});

test("API errors come back as ApiError with the backend's code", async () => {
  apiError(409, "ASSIGNMENT_CHANGED", "The dispatcher changed this task. Refresh and try again.");
  await assert.rejects(courierApi.changeStatus(PARCEL_ID, { status: "PICKED_UP" }), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "ASSIGNMENT_CHANGED");
    return true;
  });
});

// ---- Error kinds ----

test("describeCourierError: 409s reload the parcel; ASSIGNMENT_CHANGED says the dispatcher changed the task", () => {
  const read = (code: string, status = 409, fieldErrors?: Record<string, string>) =>
    errors.describeCourierError(new ApiError({ status, code: code as never, message: `msg ${code}`, fieldErrors }));
  assert.equal(read("ASSIGNMENT_CLOSED").kind, "closed");
  assert.equal(read("TASK_STEP_NOT_ALLOWED").kind, "stale");
  assert.equal(read("INVALID_STATUS_TRANSITION").kind, "stale");
  assert.equal(read("ASSIGNMENT_CHANGED").kind, "changed");
  for (const code of ["ASSIGNMENT_CLOSED", "TASK_STEP_NOT_ALLOWED", "INVALID_STATUS_TRANSITION", "ASSIGNMENT_CHANGED"]) {
    assert.equal(read(code).reload, true, `${code} reloads`);
  }
  assert.equal(errors.COURIER_ERROR_TITLE.changed, "Your dispatcher changed this task");
  assert.equal(read("NOT_FOUND", 404).kind, "not-found");
  const validation = read("VALIDATION_FAILED", 400, { receivedBy: "Enter the name…" });
  assert.equal(validation.kind, "validation");
  assert.equal(validation.reload, false);
  assert.deepEqual(validation.fieldErrors, { receivedBy: "Enter the name…" });
  assert.equal(
    errors.describeCourierError(new ApiError({ status: 400, code: "VALIDATION_FAILED", message: "bad id" }), { loadingById: true }).kind,
    "not-found",
    "a malformed id from the URL reads as not found",
  );
  assert.equal(read("SERVICE_UNAVAILABLE", 503).kind, "other");
  assert.equal(errors.describeCourierError(new Error("boom")).message, errors.UNKNOWN_ERROR);
});

// ---- Forms and request bodies ----

test("receivedBy (AT_BRANCH): required, trimmed, 2-100 characters, the backend's message", () => {
  const ok = schemas.handoverSchema.parse({ receivedBy: "  S. Silva  ", note: "  " });
  assert.equal(ok.receivedBy, "S. Silva");
  assert.deepEqual(schemas.handoverRequest(ok), { status: "AT_BRANCH", receivedBy: "S. Silva", note: undefined });
  for (const bad of ["", "   ", " A ", "x".repeat(101)]) {
    const result = schemas.handoverSchema.safeParse({ receivedBy: bad, note: "" });
    assert.equal(result.success, false, `"${bad.slice(0, 10)}" is refused`);
    assert.equal(result.error?.issues[0].message, schemas.COURIER_MESSAGES.receivedBy);
  }
  assert.equal(
    schemas.COURIER_MESSAGES.receivedBy,
    "Enter the name of the person at the branch who received the parcel.",
  );
});

test("Unable to Collect: a backend problem value is required; OTHER needs a 3+ character note", () => {
  assert.equal(schemas.unableToCollectSchema.safeParse({ problem: "", note: "" }).success, false);
  assert.equal(schemas.unableToCollectSchema.safeParse({ problem: "NOT_A_PROBLEM", note: "" }).success, false);
  const other = schemas.unableToCollectSchema.safeParse({ problem: "OTHER", note: " ab " });
  assert.equal(other.success, false);
  assert.equal(other.error?.issues[0].path.join("."), "note");
  assert.equal(other.error?.issues[0].message, schemas.COURIER_MESSAGES.noteOther);
  const ok = schemas.unableToCollectSchema.parse({ problem: "OTHER", note: " Gate locked " });
  assert.deepEqual(schemas.unableToCollectRequest(ok), { problem: "OTHER", note: "Gate locked" });
  assert.deepEqual(
    schemas.unableToCollectRequest(schemas.unableToCollectSchema.parse({ problem: "SENDER_UNAVAILABLE", note: "" })),
    { problem: "SENDER_UNAVAILABLE", note: undefined },
  );
  assert.deepEqual(
    labels.TASK_PROBLEM_VALUES,
    ["SENDER_UNAVAILABLE", "PARCEL_NOT_READY", "PARCEL_MISSING", "PARCEL_DAMAGED", "ADDRESS_UNREACHABLE", "OTHER"],
    "the backend's TaskProblem values, in its order",
  );
});

test("status bodies carry only their own fields", () => {
  assert.deepEqual(schemas.confirmStepRequest("PICKED_UP", { note: "" }), { status: "PICKED_UP", note: undefined });
  assert.deepEqual(schemas.confirmStepRequest("OUT_FOR_DELIVERY", { note: "Two boxes" }), {
    status: "OUT_FOR_DELIVERY",
    note: "Two boxes",
  });
  assert.deepEqual(
    schemas.deliveredRequest(schemas.deliveredSchema.parse({ recipientName: " Nimal ", note: "" }), PHOTO_ID),
    { status: "DELIVERED", recipientName: "Nimal", proofPhotoId: PHOTO_ID, note: undefined },
  );
  assert.deepEqual(schemas.failedRequest(schemas.failedSchema.parse({ failureReason: "WRONG_ADDRESS", note: "" })), {
    status: "FAILED",
    failureReason: "WRONG_ADDRESS",
    note: undefined,
  });
  assert.equal(schemas.failedSchema.safeParse({ failureReason: "OTHER", note: "no" }).success, false, "FAILED OTHER needs a note");
  assert.equal(schemas.deliveredSchema.safeParse({ recipientName: "N", note: "" }).success, false);
  assert.equal(schemas.confirmStepSchema.safeParse({ note: "x".repeat(501) }).success, false);
});

test("history query: page 0+, size 1-100", () => {
  assert.equal(schemas.historyQuerySchema.safeParse({ page: 0, size: 20 }).success, true);
  assert.equal(schemas.historyQuerySchema.safeParse({ page: -1, size: 20 }).success, false);
  assert.equal(schemas.historyQuerySchema.safeParse({ page: 0, size: 0 }).success, false);
  assert.equal(schemas.historyQuerySchema.safeParse({ page: 0, size: 101 }).success, false);
});

// ---- Proof of delivery ----

const PHOTO_ID = "5f1d2c4b-0000-4000-8000-000000000001";

test("uploadProof: POST /courier/deliveries/{parcelId}/proof as multipart with the field 'file'", async () => {
  const sent: { url: string; method: string; body: unknown; contentType: string | null }[] = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    sent.push({
      url: String(input),
      method: init.method ?? "GET",
      body: init.body,
      contentType: new Headers(init.headers).get("Content-Type"),
    });
    return new Response(
      JSON.stringify({ proofPhotoId: PHOTO_ID, contentType: "image/jpeg", sizeBytes: 3, uploadedAt: "2026-11-20T10:15:00Z" }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const stored = await courierApi.uploadProof(PARCEL_ID, new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "slip.jpg");

  assert.equal(sent[0].url, `${BASE}/${PARCEL_ID}/proof`);
  assert.equal(sent[0].method, "POST");
  assert.ok(sent[0].body instanceof FormData, "sent as FormData");
  assert.ok((sent[0].body as FormData).get("file") instanceof Blob);
  assert.equal(sent[0].contentType, null, "the browser sets multipart/form-data with its boundary");
  assert.equal(stored.proofPhotoId, PHOTO_ID);
  assert.equal(courierApi.proofImageUrl(PARCEL_ID), `${BASE}/${PARCEL_ID}/proof`, "loaded with the login cookie");
});

test("proof photos: JPEG, PNG or WebP up to 5 MB, the backend's words", () => {
  assert.equal(schemas.proofFileError(null), schemas.PROOF_MESSAGES.required);
  assert.equal(schemas.proofFileError({ type: "image/jpeg", size: 0 }), schemas.PROOF_MESSAGES.required);
  assert.equal(schemas.proofFileError({ type: "image/gif", size: 10 }), schemas.PROOF_MESSAGES.wrongType);
  assert.equal(schemas.proofFileError({ type: "application/pdf", size: 10 }), schemas.PROOF_MESSAGES.wrongType);
  assert.equal(schemas.proofFileError({ type: "image/png", size: schemas.PROOF_MAX_BYTES + 1 }), schemas.PROOF_MESSAGES.tooLarge);
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(schemas.proofFileError({ type, size: schemas.PROOF_MAX_BYTES }), null);
  }
  assert.equal(schemas.PROOF_MESSAGES.required, "Add a photo of the signed delivery slip.");
  assert.equal(schemas.PROOF_MESSAGES.tooLarge, "Use a photo up to 5 MB.");
});

test("list entries carry the proof summary once delivered", () => {
  const parsed = schemas.courierDeliverySchema.parse(
    delivery({ status: "DELIVERED", recipient: null, nextStatuses: [], completed: true, completedAt: "2026-11-05T07:00:00Z", proof: { recipientName: "Nimal Perera", hasPhoto: true } }, { outcome: "DELIVERED" }),
  );
  assert.deepEqual(parsed.proof, { recipientName: "Nimal Perera", hasPhoto: true });
});

// ---- One coherent API integration ----

test("the courier feature only calls /courier/deliveries: no assignment, parcel or complete endpoints are left", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  };
  walk(path.join(SRC_ROOT, "features/courier"));
  walk(path.join(SRC_ROOT, "app/courier"));
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\/courier\/assignments/, `${file} calls no /courier/assignments endpoint`);
    assert.doesNotMatch(source, /\/complete["'`]/, `${file} has no "complete task" call`);
  }
  // The API calls live in api.ts (and preview-api.ts, which answers the same paths); /courier/parcels/{id} is now only
  // the frontend's parcel page (courierRoutes.parcel), never an endpoint.
  for (const file of ["features/courier/api.ts", "features/courier/preview/preview-api.ts"]) {
    const source = fs.readFileSync(path.join(SRC_ROOT, file), "utf8");
    assert.doesNotMatch(source, /\/courier\/parcels/, `${file} calls no /courier/parcels endpoint`);
    assert.match(source, /\/courier\/deliveries/, `${file} uses /courier/deliveries`);
  }
  assert.equal(labels.courierRoutes.parcel(PARCEL_ID), `/courier/parcels/${PARCEL_ID}`, "the parcel page route");
  assert.ok(!("task" in labels.courierRoutes), "no task page route");
  assert.equal(fs.existsSync(path.join(SRC_ROOT, "app/courier/tasks")), false, "the task page is gone");
});
