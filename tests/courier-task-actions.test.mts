import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * The branch handover (and returning failed deliveries to the branch) and completing a task on
 * /courier/tasks/[assignmentId]. Requests go through courierApi.handover / courierApi.complete (fetch is replaced);
 * readyForHandover and canComplete come from the API. Fixtures follow API.md "Courier".
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

type ActionsModule = typeof import("../src/features/courier/lib/task-actions");
type SchemasModule = typeof import("../src/features/courier/schemas");
type DialogModule = typeof import("../src/features/courier/components/action-dialog");
type Item = import("../src/features/courier/types").CourierTaskItem;
type Detail = import("../src/features/courier/types").CourierTaskDetail;

const actions = loadTsModule<ActionsModule>("@/features/courier/lib/task-actions");
const schemas = loadTsModule<SchemasModule>("@/features/courier/schemas");
const { useSingleFlight } = loadTsModule<DialogModule>("@/features/courier/components/action-dialog");
const React = nodeRequire("react") as typeof import("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");

const TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887001";
const P1 = "ab598d39-d554-42f5-b609-6fa90f3a5357";
const P2 = "4d15dee6-ad98-4ac0-91a5-fb8d08659571";
const P3 = "9b2f0c1e-3d4a-4b5c-8d6e-7f8091a2b3c4";
const name = (code: string) => code.charAt(0) + code.slice(1).toLowerCase();

const item = (parcelId: string, overrides: Partial<Item> = {}): Item => ({
  parcelId,
  trackingNumber: "SD2611060001",
  sequence: 1,
  parcelStatus: "PICKED_UP",
  outcome: "COLLECTED",
  allowedOutcomes: [],
  readyForHandover: true,
  contact: null,
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
  updatedAt: "2026-11-09T02:30:00Z",
  ...overrides,
});

const task = (overrides: Partial<Detail> = {}): Detail => ({
  assignmentId: TASK_ID,
  type: "PICKUP",
  status: "IN_PROGRESS",
  originBranch: null,
  destinationBranch: "GAMPAHA",
  scheduledFor: "2026-11-09",
  note: null,
  assignedAt: "2026-11-09T02:30:00Z",
  completedAt: null,
  counts: { total: 3, open: 2, closed: 1, problems: 1 },
  canComplete: false,
  items: [
    item(P1, { sequence: 1 }),
    item(P2, { sequence: 2, outcome: "NOT_COLLECTED", problem: "PARCEL_NOT_READY", parcelStatus: "CREATED", readyForHandover: false }),
    item(P3, { sequence: 3 }),
  ],
  ...overrides,
});

// ---- A fake fetch ----

process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";
interface Call {
  url: URL;
  method: string;
  body: unknown;
  contentType: string | undefined;
}

function answer(status: number, body: unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    calls.push({
      url: new URL(String(input)),
      method: init.method ?? "GET",
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
      contentType: (init.headers as Record<string, string> | undefined)?.["Content-Type"],
    });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

const apiError = (status: number, code: string, message: string, fieldErrors?: Record<string, string>) =>
  answer(status, { status, code, message, ...(fieldErrors ? { fieldErrors } : {}) });

// ---- Which parcels, which words ----

test("the handover offers exactly the parcels the API marked readyForHandover, in the task's order", () => {
  assert.deepEqual(actions.handoverCandidates(task()).map((i) => i.parcelId), [P1, P3]);
  assert.deepEqual(actions.handoverCandidates(task({ items: [item(P1, { readyForHandover: false })] })), []);
});

test("pickup and transfer hand over at the destination; a delivery task returns failed parcels to its origin", () => {
  const pickup = actions.handoverText(task(), name);
  assert.equal(pickup.returning, false);
  assert.equal(pickup.title, "Hand over at Gampaha branch");
  assert.match(pickup.description, /handing over doesn't mean they are delivered/);
  assert.equal(pickup.success(2), "2 parcels handed over at Gampaha branch");

  assert.equal(actions.handoverText(task({ type: "TRANSFER", originBranch: "GAMPAHA", destinationBranch: "MATARA" }), name).title, "Hand over at Matara branch");

  const delivery = actions.handoverText(task({ type: "DELIVERY", originBranch: "MATARA", destinationBranch: null }), name);
  assert.equal(delivery.returning, true);
  assert.equal(delivery.title, "Return to Matara branch");
  assert.equal(delivery.submit, "Return to branch");
  assert.match(delivery.description, /they are not delivered/);
  assert.equal(delivery.success(1), "1 parcel returned to Matara branch");
});

test("receivedBy: required, trimmed, 2-100 characters; the body carries the selected parcels", () => {
  const ok = schemas.handoverSchema.parse({ parcelIds: [P1, P3], receivedBy: "  S. Silva ", note: "" });
  assert.deepEqual(schemas.handoverRequest(ok), { parcelIds: [P1, P3], receivedBy: "S. Silva", note: undefined });

  const message = "Enter the name of the person at the branch who received the parcels.";
  for (const receivedBy of ["", "   ", "S", "x".repeat(101)]) {
    const result = schemas.handoverSchema.safeParse({ parcelIds: [P1], receivedBy, note: "" });
    assert.equal(result.success, false, JSON.stringify(receivedBy));
    assert.equal(result.error?.issues.find((i) => i.path[0] === "receivedBy")?.message, message);
  }
  assert.equal(
    schemas.handoverSchema.safeParse({ parcelIds: [], receivedBy: "S. Silva", note: "" }).error?.issues[0].message,
    "Select at least one parcel.",
  );
});

// ---- Handover ----

test("a handover posts the selected parcels and who received them, and returns the task as the API has it", async () => {
  const after = task({
    items: [
      item(P1, { outcome: "HANDED_OVER", parcelStatus: "AT_BRANCH", readyForHandover: false, receivedBy: "S. Silva" }),
      item(P3, { outcome: "HANDED_OVER", parcelStatus: "AT_BRANCH", readyForHandover: false, receivedBy: "S. Silva" }),
    ],
    canComplete: true,
  });
  const calls = answer(200, after);
  const result = await actions.submitHandover(TASK_ID, { parcelIds: [P1, P3], receivedBy: "S. Silva", note: "Counter 2" });
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url.pathname, `/api/v1/courier/assignments/${TASK_ID}/handover`);
  assert.deepEqual(calls[0].body, { parcelIds: [P1, P3], receivedBy: "S. Silva", note: "Counter 2" });
  assert.equal(result.ok, true);
  if (result.ok) {
    // Handed over means "at the branch", never "delivered".
    assert.deepEqual(result.task.items.map((i) => [i.outcome, i.parcelStatus]), [["HANDED_OVER", "AT_BRANCH"], ["HANDED_OVER", "AT_BRANCH"]]);
    assert.equal(result.task.canComplete, true);
  }
});

test("returning a failed delivery uses the same handover endpoint and comes back RETURNED, at the branch", async () => {
  const failed = task({
    type: "DELIVERY",
    originBranch: "MATARA",
    destinationBranch: null,
    items: [item(P1, { outcome: "FAILED", parcelStatus: "FAILED", failureReason: "RECIPIENT_UNAVAILABLE", readyForHandover: true })],
  });
  assert.deepEqual(actions.handoverCandidates(failed).map((i) => i.parcelId), [P1]);

  const calls = answer(200, {
    ...failed,
    canComplete: true,
    items: [item(P1, { outcome: "RETURNED", parcelStatus: "AT_BRANCH", failureReason: "RECIPIENT_UNAVAILABLE", readyForHandover: false })],
  });
  const result = await actions.submitHandover(TASK_ID, { parcelIds: [P1], receivedBy: "R. Perera" });
  assert.equal(calls[0].url.pathname, `/api/v1/courier/assignments/${TASK_ID}/handover`);
  assert.deepEqual(calls[0].body, { parcelIds: [P1], receivedBy: "R. Perera" });
  assert.equal(result.ok && result.task.items[0].outcome, "RETURNED");
  assert.equal(result.ok && result.task.items[0].parcelStatus, "AT_BRANCH");
});

test("all or nothing: the API refusing one parcel (409) reloads the task; field errors stay in the dialog", async () => {
  apiError(409, "TASK_STEP_NOT_ALLOWED", "This step isn't possible for this parcel right now.");
  const refused = await actions.submitHandover(TASK_ID, { parcelIds: [P1, P3], receivedBy: "S. Silva" });
  assert.deepEqual(refused, {
    ok: false,
    failure: { kind: "reload", title: "This task has changed", message: "This step isn't possible for this parcel right now." },
  });

  apiError(409, "ASSIGNMENT_CHANGED", "This task was just changed by someone else. Refresh and try again.");
  const clash = await actions.submitHandover(TASK_ID, { parcelIds: [P1], receivedBy: "S. Silva" });
  assert.equal(!clash.ok && clash.failure.kind, "reload");

  apiError(409, "ASSIGNMENT_CLOSED", "This task is already completed or was cancelled.");
  const closed = await actions.submitHandover(TASK_ID, { parcelIds: [P1], receivedBy: "S. Silva" });
  assert.equal(!closed.ok && closed.failure.kind === "reload" && closed.failure.title, "This task is closed");

  apiError(400, "VALIDATION_FAILED", "Some fields need attention.", { receivedBy: "Enter the name of the person at the branch who received the parcels." });
  const invalid = await actions.submitHandover(TASK_ID, { parcelIds: [P1], receivedBy: "S" });
  assert.equal(!invalid.ok && invalid.failure.kind, "fields");
});

// ---- Complete ----

test("completing posts no body and answers the summary, COMPLETED", async () => {
  const calls = answer(200, {
    assignmentId: TASK_ID,
    type: "PICKUP",
    status: "COMPLETED",
    originBranch: null,
    destinationBranch: "GAMPAHA",
    scheduledFor: "2026-11-09",
    note: null,
    assignedAt: "2026-11-09T02:30:00Z",
    completedAt: "2026-11-09T07:00:00Z",
    counts: { total: 3, open: 0, closed: 3, problems: 1 },
    canComplete: false,
  });
  const result = await actions.submitComplete(TASK_ID);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url.pathname, `/api/v1/courier/assignments/${TASK_ID}/complete`);
  assert.equal(calls[0].body, undefined);
  assert.equal(calls[0].contentType, undefined);
  assert.equal(result.ok && result.task.status, "COMPLETED");
});

test("ASSIGNMENT_NOT_FINISHED explains why and reloads; other 409s reload; a network failure can be retried", async () => {
  apiError(409, "ASSIGNMENT_NOT_FINISHED", "Update every parcel in this task before you finish it.");
  assert.deepEqual(await actions.submitComplete(TASK_ID), {
    ok: false,
    failure: { kind: "reload", title: "Some parcels still need an update", message: "Update every parcel in this task before you finish it." },
  });

  apiError(409, "ASSIGNMENT_CHANGED", "This task was just changed by someone else. Refresh and try again.");
  const changed = await actions.submitComplete(TASK_ID);
  assert.equal(!changed.ok && changed.failure.kind, "reload");

  apiError(404, "NOT_FOUND", "We couldn't find what you were looking for.");
  const gone = await actions.submitComplete(TASK_ID);
  assert.equal(!gone.ok && gone.failure.kind, "gone");

  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  const offline = await actions.submitComplete(TASK_ID);
  assert.equal(!offline.ok && offline.failure.kind, "retry");
});

test("the completion summary counts what happened to each parcel", () => {
  assert.deepEqual(
    actions.outcomeSummary(task()).map((line) => [line.label, line.count]),
    [["Collected", 2], ["Not collected", 1]],
  );
});

// ---- One request at a time ----

test("a second submit while one is running is ignored, and saving is reported around it", async () => {
  const saving: boolean[] = [];
  let run: ((work: () => Promise<void>) => Promise<void>) | undefined;
  function Probe() {
    run = useSingleFlight((value: boolean) => saving.push(value));
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));

  let calls = 0;
  let release!: () => void;
  const work = () => {
    calls += 1;
    return new Promise<void>((resolve) => (release = resolve));
  };
  const first = run!(work);
  const second = run!(work); // pressed again while the first is still running
  release();
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.deepEqual(saving, [true, false]);

  await run!(async () => {
    calls += 1;
  });
  assert.equal(calls, 2, "once it finished, the next submit runs");
});

// ---- The task page ----

test("the page enables the handover from readyForHandover and Complete only from canComplete, and offers nothing on a closed task", () => {
  const page = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/task-detail-view.tsx"), "utf8");
  assert.match(page, /const readyCount = handoverCandidates\(task\)\.length;/);
  assert.match(page, /disabled=\{readyCount === 0 \|\| busy\}/, "handover waits for ready parcels and running actions");
  assert.match(page, /disabled=\{!task\.canComplete \|\| busy\}/, "Complete task only when the API says canComplete");
  assert.match(page, /const actions = closed \? undefined :/, "no actions on a completed or cancelled task");
  assert.match(page, /\{closed \? null : \(\s*<>\s*<HandoverDialog/, "no handover or complete dialogs on a closed task");
  assert.match(page, /const busy = refreshing \|\| saving \|\| target !== null \|\| dialog !== null;/);
  assert.match(page, /function completed[\s\S]*?onReload\(\);/, "after completing, the task is loaded again to show it closed");

  const handover = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/handover-dialog.tsx"), "utf8");
  assert.match(handover, /handoverCandidates\(task\)/, "the dialog lists only the ready parcels");
  assert.match(handover, /submitHandover\(task\.assignmentId, body\)/, "the handover goes through courierApi.handover");
  assert.match(handover, /<GuardedDialog/);
  const complete = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/complete-task-dialog.tsx"), "utf8");
  assert.match(complete, /submitComplete\(task\.assignmentId\)/, "completing goes through courierApi.complete");
  assert.match(complete, /doesn't mean every parcel was delivered/);
  assert.match(complete, /<GuardedDialog/);
});
