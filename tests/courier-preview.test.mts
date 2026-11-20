import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * Courier preview mode (src/features/courier/preview): off by default and never in production; when on, courierApi
 * answers from in-memory sample data without calling fetch, every answer passes the response schemas, and the
 * sample tasks follow the backend's step rules (dispatch.ItemOutcome, courier ParcelMoves).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.join(path.resolve(__dirname, ".."), "src");
const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map<string, { exports: Record<string, unknown> }>();

/** Loads a src/ TypeScript module (same approach as courier-data-layer.test.mts). */
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

type FlagModule = typeof import("../src/features/courier/preview/flag");
type PreviewModule = typeof import("../src/features/courier/preview/preview-api");
type RulesModule = typeof import("../src/features/courier/preview/rules");
type ApiModule = typeof import("../src/features/courier/api");
type SchemasModule = typeof import("../src/features/courier/schemas");
type ClientModule = typeof import("../src/lib/api/client");
type CourierTaskDetail = import("../src/features/courier/types").CourierTaskDetail;
type CourierTaskItem = import("../src/features/courier/types").CourierTaskItem;

// The modules load in preview mode (the flag is read once, at load), with fetch made to fail: any network call fails
// the test.
const savedFlag = process.env.NEXT_PUBLIC_COURIER_PREVIEW;
process.env.NEXT_PUBLIC_COURIER_PREVIEW = "true";
let fetchCalls = 0;
globalThis.fetch = (async () => {
  fetchCalls += 1;
  throw new Error("preview mode must not call fetch");
}) as typeof fetch;

const { isCourierPreviewEnabled, COURIER_PREVIEW } = loadTsModule<FlagModule>("@/features/courier/preview/flag");
const { courierApi } = loadTsModule<ApiModule>("@/features/courier/api");
const { resetCourierPreview } = loadTsModule<PreviewModule>("@/features/courier/preview/preview-api");
const rules = loadTsModule<RulesModule>("@/features/courier/preview/rules");
const schemas = loadTsModule<SchemasModule>("@/features/courier/schemas");
const { ApiError } = loadTsModule<ClientModule>("@/lib/api/client");
process.env.NEXT_PUBLIC_COURIER_PREVIEW = savedFlag;

const fresh = () => resetCourierPreview(new Date(), { delayMs: 0 });

async function taskOfType(type: "PICKUP" | "DELIVERY", status: "ASSIGNED" | "IN_PROGRESS") {
  const today = await courierApi.today();
  // The first open task of this type for today that still has work (not the one ready to complete).
  const found = today.assignments.find(
    (task) => task.type === type && task.status === status && task.scheduledFor === today.date && !task.canComplete,
  );
  assert.ok(found, `a ${status} ${type} task for today`);
  return courierApi.task(found.assignmentId);
}

const byOutcome = (task: CourierTaskDetail, outcome: string) =>
  task.items.filter((entry: CourierTaskItem) => entry.outcome === outcome);

async function rejects(promise: Promise<unknown>, code: string, status: number) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

// ---- The switch ----

test("preview is off by default, needs exactly \"true\", and is never on in production", () => {
  assert.equal(isCourierPreviewEnabled(undefined, "development"), false);
  assert.equal(isCourierPreviewEnabled("", "development"), false);
  assert.equal(isCourierPreviewEnabled("false", "development"), false);
  assert.equal(isCourierPreviewEnabled("1", "development"), false);
  assert.equal(isCourierPreviewEnabled("TRUE", "development"), false);
  assert.equal(isCourierPreviewEnabled("true", "development"), true);
  assert.equal(isCourierPreviewEnabled("true", "test"), true);
  assert.equal(isCourierPreviewEnabled("true", "production"), false);
  assert.equal(COURIER_PREVIEW, true, "this test file loads the modules with the flag on");
});

test("api.ts only uses the preview behind the flag, and calls apiFetch otherwise", () => {
  const source = fs.readFileSync(path.join(SRC_ROOT, "features/courier/api.ts"), "utf8");
  assert.match(source, /const request: typeof apiFetch = COURIER_PREVIEW \? courierPreviewFetch : apiFetch;/);
  assert.equal((source.match(/await request<unknown>\(/g) ?? []).length, 7);
  assert.doesNotMatch(source, /fetch\(/);
  const flag = fs.readFileSync(path.join(SRC_ROOT, "features/courier/preview/flag.ts"), "utf8");
  assert.match(flag, /process\.env\.NODE_ENV !== "production" && process\.env\.NEXT_PUBLIC_COURIER_PREVIEW === "true"/);
});

test("the preview code never calls fetch or apiFetch", () => {
  for (const file of ["preview-api.ts", "data.ts", "rules.ts", "flag.ts"]) {
    const source = fs.readFileSync(path.join(SRC_ROOT, "features/courier/preview", file), "utf8");
    assert.doesNotMatch(source, /\bfetch\(/, file);
    assert.doesNotMatch(source, /apiFetch\(/, file);
  }
});

test("the courier layout shows the preview banner, which renders nothing when preview is off", () => {
  const layout = fs.readFileSync(path.join(SRC_ROOT, "app/courier/layout.tsx"), "utf8");
  assert.match(layout, /<CourierPreviewBanner \/>/);
  const banner = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/preview-banner.tsx"), "utf8");
  assert.match(banner, /if \(!COURIER_PREVIEW\) return null;/);
  assert.match(banner, /nothing is sent to the server/);
});

// ---- Sample data ----

test("today's tasks: pickups and deliveries only, a later day, two done today; in the backend's order", async () => {
  fresh();
  const today = await courierApi.today();
  const types = new Set(today.assignments.map((task) => task.type));
  assert.deepEqual([...types].sort(), ["DELIVERY", "PICKUP"], "no branch transfers: they aren't courier work");
  assert.ok(today.assignments.some((task) => task.scheduledFor > today.date), "a task for a later day");
  assert.equal(today.completedToday, 2);
  assert.equal(today.open, today.assignments.filter((task) => task.status !== "COMPLETED").length);
  assert.ok(today.assignments.some((task) => task.canComplete), "a task ready to complete");

  const groups = today.assignments.map((task) =>
    task.status === "IN_PROGRESS" ? 0 : task.status === "ASSIGNED" ? 1 : 2,
  );
  assert.deepEqual(groups, [...groups].sort((a, b) => a - b));
  assert.equal(fetchCalls, 0);
});

test("every task, item and parcel answer passes the courier response schemas", async () => {
  fresh();
  const today = await courierApi.today();
  const first = await courierApi.history({ page: 0, size: 100 });
  const ids = new Set([...today.assignments, ...first.content].map((task) => task.assignmentId));
  const parcelIds = new Set<string>();

  for (const id of ids) {
    const task = await courierApi.task(id);
    assert.ok(schemas.courierTaskDetailSchema.safeParse(task).success, id);
    for (const entry of task.items) parcelIds.add(entry.parcelId);
  }
  for (const parcelId of parcelIds) {
    const parcel = await courierApi.parcel(parcelId);
    assert.ok(schemas.courierParcelDetailSchema.safeParse(parcel).success, parcelId);
    assert.ok(parcel.history.length > 0);
    assert.equal(parcel.history[0].status, parcel.status, "history is newest first and ends at the status");
  }
  assert.ok(parcelIds.size >= 30, `${parcelIds.size} parcels`);
  assert.equal(fetchCalls, 0);
});

test("the sample has no branch transfer anywhere: today, history or the parcels' tasks", async () => {
  fresh();
  const today = await courierApi.today();
  const history = await courierApi.history({ page: 0, size: 100 });
  const tasks = [...today.assignments, ...history.content];
  assert.ok(tasks.length > 0);
  assert.ok(tasks.every((task) => task.type === "PICKUP" || task.type === "DELIVERY"));
  for (const task of tasks) {
    const detail = await courierApi.task(task.assignmentId);
    for (const entry of detail.items) {
      const parcel = await courierApi.parcel(entry.parcelId);
      assert.ok(parcel.myItems.every((mine) => mine.type !== "TRANSFER"), parcel.trackingNumber);
    }
  }
  assert.equal(rules.nextOutcomes("TRANSFER", "PENDING").length, 0, "no transfer steps in the preview");
  assert.equal(fetchCalls, 0);
});

test("the sample covers each step: waiting, collected, out for delivery, delivered, failed, not taken, handed over, returned", async () => {
  fresh();
  const delivery = await taskOfType("DELIVERY", "IN_PROGRESS");
  assert.deepEqual(byOutcome(delivery, "PENDING")[0].allowedOutcomes, ["LOADED", "NOT_LOADED"]);
  assert.deepEqual(byOutcome(delivery, "LOADED")[0].allowedOutcomes, ["DELIVERED", "FAILED"]);
  assert.ok(byOutcome(delivery, "LOADED")[0].codAmount, "cash to collect");
  assert.equal(byOutcome(delivery, "DELIVERED")[0].contact, null, "no contact once delivered");
  const failed = byOutcome(delivery, "FAILED")[0];
  assert.equal(failed.parcelStatus, "FAILED");
  assert.equal(failed.readyForHandover, true, "a failed delivery can be returned");

  const pickup = await taskOfType("PICKUP", "IN_PROGRESS");
  const collected = byOutcome(pickup, "COLLECTED")[0];
  assert.equal(collected.parcelStatus, "PICKED_UP");
  assert.equal(collected.readyForHandover, true, "a collected parcel can be handed over");
  assert.deepEqual(byOutcome(pickup, "PENDING")[0].allowedOutcomes, ["COLLECTED", "NOT_COLLECTED"]);
  assert.ok(byOutcome(pickup, "PENDING")[0].contact, "the sender while the parcel is open");
  assert.equal(byOutcome(pickup, "NOT_COLLECTED")[0].problem, "SENDER_UNAVAILABLE");
  assert.ok(pickup.items.every((entry) => entry.codAmount === null), "no cash on a pickup");

  const today = await courierApi.today();
  const doneToday = today.assignments.filter((task) => task.status === "COMPLETED");
  assert.deepEqual(doneToday.map((task) => task.type).sort(), ["DELIVERY", "PICKUP"]);
  const finished = await Promise.all(doneToday.map((task) => courierApi.task(task.assignmentId)));
  const outcomes = finished.flatMap((task) => task.items.map((entry) => entry.outcome)).sort();
  assert.deepEqual(outcomes, ["DELIVERED", "HANDED_OVER", "NOT_COLLECTED", "RETURNED"]);
});

// ---- Walking through the tasks ----

test("pickup: collect, couldn't collect, hand over at the branch, then complete", async () => {
  fresh();
  const pickup = await taskOfType("PICKUP", "ASSIGNED");
  const [first, second, third] = pickup.items;

  await rejects(courierApi.complete(pickup.assignmentId), "ASSIGNMENT_NOT_FINISHED", 409);
  await rejects(
    courierApi.handover(pickup.assignmentId, { parcelIds: [first.parcelId], receivedBy: "Chamari" }),
    "TASK_STEP_NOT_ALLOWED",
    409,
  );

  let task = await courierApi.recordOutcome(pickup.assignmentId, first.parcelId, { outcome: "COLLECTED" });
  assert.equal(task.status, "IN_PROGRESS", "the first step starts the task");
  assert.equal(task.items[0].parcelStatus, "PICKED_UP");
  assert.equal(task.items[0].readyForHandover, true);
  task = await courierApi.recordOutcome(pickup.assignmentId, second.parcelId, { outcome: "COLLECTED" });
  task = await courierApi.recordOutcome(pickup.assignmentId, third.parcelId, {
    outcome: "NOT_COLLECTED",
    problem: "SENDER_UNAVAILABLE",
  });
  assert.equal(task.counts.problems, 1);

  task = await courierApi.handover(pickup.assignmentId, {
    parcelIds: [first.parcelId, second.parcelId],
    receivedBy: "Chamari",
  });
  assert.deepEqual(task.items.map((entry) => entry.outcome), ["HANDED_OVER", "HANDED_OVER", "NOT_COLLECTED"]);
  assert.equal(task.canComplete, true);

  const parcel = await courierApi.parcel(first.parcelId);
  assert.equal(parcel.status, "AT_BRANCH");
  assert.equal(parcel.currentBranch, "COLOMBO");

  const done = await courierApi.complete(pickup.assignmentId);
  assert.equal(done.status, "COMPLETED");
  await rejects(
    courierApi.recordOutcome(pickup.assignmentId, third.parcelId, { outcome: "COLLECTED" }),
    "ASSIGNMENT_CLOSED",
    409,
  );
  const today = await courierApi.today();
  assert.equal(today.completedToday, 3);
  assert.equal(fetchCalls, 0);
});

test("pickup in progress: collect the waiting parcel, hand over some now and the rest later, then complete", async () => {
  fresh();
  const pickup = await taskOfType("PICKUP", "IN_PROGRESS");
  const waiting = byOutcome(pickup, "PENDING")[0];
  const collected = byOutcome(pickup, "COLLECTED")[0];
  let task = await courierApi.recordOutcome(pickup.assignmentId, waiting.parcelId, { outcome: "COLLECTED" });
  assert.equal(task.items.find((entry) => entry.parcelId === waiting.parcelId)?.parcelStatus, "PICKED_UP");
  assert.equal(task.items.filter((entry) => entry.readyForHandover).length, 2);

  // Leave one out of the first handover: it stays ready, and the task can't be completed yet.
  task = await courierApi.handover(pickup.assignmentId, { parcelIds: [collected.parcelId], receivedBy: "Colombo branch desk" });
  assert.equal(task.canComplete, false);
  await rejects(courierApi.complete(pickup.assignmentId), "ASSIGNMENT_NOT_FINISHED", 409);
  task = await courierApi.handover(pickup.assignmentId, { parcelIds: [waiting.parcelId], receivedBy: "Colombo branch desk" });
  assert.equal(task.canComplete, true);
  const parcel = await courierApi.parcel(waiting.parcelId);
  assert.equal(parcel.status, "AT_BRANCH");
  assert.equal(parcel.currentBranch, pickup.destinationBranch);
  assert.equal((await courierApi.complete(pickup.assignmentId)).status, "COMPLETED");
});

test("delivery: deliver, fail, return the failed parcels to the branch, then complete", async () => {
  fresh();
  const delivery = await taskOfType("DELIVERY", "IN_PROGRESS");
  const waiting = byOutcome(delivery, "PENDING")[0];
  const out = byOutcome(delivery, "LOADED")[0];

  await rejects(
    courierApi.recordOutcome(delivery.assignmentId, waiting.parcelId, { outcome: "DELIVERED", recipientName: "A B" }),
    "TASK_STEP_NOT_ALLOWED",
    409,
  );
  await rejects(
    courierApi.recordOutcome(delivery.assignmentId, out.parcelId, { outcome: "FAILED", failureReason: "OTHER" }),
    "VALIDATION_FAILED",
    400,
  );

  await courierApi.recordOutcome(delivery.assignmentId, waiting.parcelId, { outcome: "LOADED" });
  await courierApi.recordOutcome(delivery.assignmentId, waiting.parcelId, {
    outcome: "DELIVERED",
    recipientName: "Fathima Nazeer",
  });
  let task = await courierApi.recordOutcome(delivery.assignmentId, out.parcelId, {
    outcome: "FAILED",
    failureReason: "WRONG_ADDRESS",
  });
  assert.equal(task.canComplete, false, "failed parcels are still with the courier");

  const toReturn = task.items.filter((entry) => entry.readyForHandover).map((entry) => entry.parcelId);
  assert.equal(toReturn.length, 2);
  task = await courierApi.handover(delivery.assignmentId, { parcelIds: toReturn, receivedBy: "Colombo branch desk" });
  assert.equal(byOutcome(task, "RETURNED").length, 2);
  assert.ok(byOutcome(task, "RETURNED").every((entry) => entry.failureReason !== null), "keeps the failure reason");
  assert.equal(task.canComplete, true);

  const parcel = await courierApi.parcel(out.parcelId);
  assert.equal(parcel.status, "AT_BRANCH");
  assert.equal(parcel.currentBranch, "COLOMBO");
  assert.deepEqual(parcel.history.slice(0, 2).map((entry) => entry.status), ["AT_BRANCH", "FAILED"]);
  assert.equal((await courierApi.complete(delivery.assignmentId)).status, "COMPLETED");
});

test("unknown tasks and parcels answer 404, like another courier's", async () => {
  fresh();
  const unknown = "7e570000-0000-4000-8000-999999999999";
  await rejects(courierApi.task(unknown), "NOT_FOUND", 404);
  await rejects(courierApi.parcel(unknown), "NOT_FOUND", 404);
  await rejects(courierApi.complete(unknown), "NOT_FOUND", 404);
});

// ---- History ----

test("history: closed tasks newest first, 2 pages of 20, search by tracking number", async () => {
  fresh();
  const first = await courierApi.history({ page: 0, size: 20 });
  assert.equal(first.content.length, 20);
  assert.ok(first.totalElements >= 25 && first.totalPages === 2, `${first.totalElements} closed tasks`);
  assert.ok(first.content.every((task) => task.status === "COMPLETED" || task.status === "CANCELLED"));
  assert.ok(first.content.some((task) => task.status === "CANCELLED"));
  const closed = first.content.map((task) => task.completedAt ?? "");
  assert.ok(closed.filter(Boolean).every((at, index, all) => index === 0 || all[index - 1] >= at));

  const second = await courierApi.history({ page: 1, size: 20 });
  assert.equal(second.content.length, first.totalElements - 20);

  // The parcel out for delivery today failed yesterday and this courier returned it to the branch.
  const delivery = await taskOfType("DELIVERY", "IN_PROGRESS");
  const out = byOutcome(delivery, "LOADED")[0];
  const spaced = `${out.trackingNumber.slice(0, 6).toLowerCase()} ${out.trackingNumber.slice(6)}`;
  const found = await courierApi.history({ trackingNumber: spaced });
  assert.equal(found.totalElements, 1);
  assert.equal(found.content[0].type, "DELIVERY");
  const yesterday = await courierApi.task(found.content[0].assignmentId);
  assert.equal(yesterday.items[0].outcome, "RETURNED");

  const none = await courierApi.history({ trackingNumber: "SD0000000000" });
  assert.equal(none.totalElements, 0);
  assert.equal(fetchCalls, 0);
});

// ---- Same rules as the backend ----

test("the preview step rules match dispatch.ItemOutcome and ParcelMoves", () => {
  const T = { PICKUP: { type: "PICKUP", originBranch: null, destinationBranch: "COLOMBO" } } as const;
  assert.deepEqual(rules.nextOutcomes("PICKUP", "PENDING"), ["COLLECTED", "NOT_COLLECTED"]);
  assert.deepEqual(rules.nextOutcomes("PICKUP", "COLLECTED"), ["HANDED_OVER"]);

  assert.deepEqual(rules.nextOutcomes("DELIVERY", "PENDING"), ["LOADED", "NOT_LOADED"]);
  assert.deepEqual(rules.nextOutcomes("DELIVERY", "LOADED"), ["DELIVERED", "FAILED"]);
  assert.deepEqual(rules.nextOutcomes("DELIVERY", "FAILED"), ["RETURNED"]);
  assert.deepEqual(rules.nextOutcomes("DELIVERY", "DELIVERED"), []);

  assert.equal(rules.closes("DELIVERY", "FAILED"), false);
  assert.equal(rules.closes("DELIVERY", "RETURNED"), true);
  assert.equal(rules.closes("PICKUP", "NOT_COLLECTED"), true);
  assert.equal(rules.closes("DELIVERY", "NOT_LOADED"), true);
  assert.equal(rules.closes("PICKUP", "COLLECTED"), false);

  assert.deepEqual(rules.allowedOutcomes(T.PICKUP, false, "COLLECTED"), [], "handover is never an outcome button");
  assert.deepEqual(rules.allowedOutcomes(T.PICKUP, true, "PENDING"), [], "nothing once the task is closed");
  assert.equal(rules.readyForHandover(T.PICKUP, false, "COLLECTED"), true);
  assert.equal(rules.readyForHandover(T.PICKUP, true, "COLLECTED"), false);
  assert.deepEqual(rules.parcelMove({ type: "DELIVERY", originBranch: "COLOMBO", destinationBranch: null }, "RETURNED"), {
    status: "AT_BRANCH",
    branch: "COLOMBO",
  });
});
