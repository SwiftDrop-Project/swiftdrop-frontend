import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * Recording parcel outcomes on /courier/tasks/[assignmentId]. The forms (values → request body with the F1
 * schemas), sending through courierApi.recordOutcome (fetch is replaced), what each failure makes the screen do
 * (stale task → reload), and the parcel row's buttons. Fixtures follow API.md "Courier".
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

type FlowModule = typeof import("../src/features/courier/lib/outcome-flow");
type SchemasModule = typeof import("../src/features/courier/schemas");
type LabelsModule = typeof import("../src/features/courier/lib/labels");
type ItemRowModule = typeof import("../src/features/courier/components/task-item-row");
type ClientModule = typeof import("../src/lib/api/client");
type Item = import("../src/features/courier/types").CourierTaskItem;

const flow = loadTsModule<FlowModule>("@/features/courier/lib/outcome-flow");
const schemas = loadTsModule<SchemasModule>("@/features/courier/schemas");
const labels = loadTsModule<LabelsModule>("@/features/courier/lib/labels");
const { TaskItemRow } = loadTsModule<ItemRowModule>("@/features/courier/components/task-item-row");
const { ApiError } = loadTsModule<ClientModule>("@/lib/api/client");
const React = nodeRequire("react") as typeof import("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");

const TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887001";
const PARCEL_ID = "ab598d39-d554-42f5-b609-6fa90f3a5357";

const item = (overrides: Partial<Item> = {}): Item => ({
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
  updatedAt: "2026-11-09T02:30:00Z",
  ...overrides,
});

const taskAfter = (outcome: string, extra: Partial<Item> = {}) => ({
  assignmentId: TASK_ID,
  type: "PICKUP",
  status: "IN_PROGRESS",
  originBranch: null,
  destinationBranch: "GAMPAHA",
  scheduledFor: "2026-11-09",
  note: null,
  assignedAt: "2026-11-09T02:30:00Z",
  completedAt: null,
  counts: { total: 1, open: 1, closed: 0, problems: 0 },
  canComplete: false,
  items: [item({ outcome: outcome as Item["outcome"], allowedOutcomes: [], ...extra })],
});

// ---- A fake fetch ----

process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";

interface Call {
  url: URL;
  method: string;
  body: unknown;
}

function answer(status: number, body: unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    calls.push({
      url: new URL(String(input)),
      method: init.method ?? "GET",
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

// ---- Which form, which words ----

test("every outcome the outcome endpoint takes has a form; the handover outcomes don't", () => {
  assert.deepEqual(Object.keys(flow.OUTCOME_FORM_KIND).sort(), Object.keys(labels.OUTCOME_ACTION_LABEL).sort());
  assert.deepEqual(
    Object.entries(flow.OUTCOME_FORM_KIND).sort(),
    [
      ["COLLECTED", "confirm"],
      ["DELIVERED", "delivered"],
      ["FAILED", "failed"],
      ["LOADED", "confirm"],
      ["NOT_COLLECTED", "not-taken"],
      ["NOT_LOADED", "not-taken"],
    ],
  );
});

test("the dialog names the parcel and who the courier meets", () => {
  const collected = flow.outcomeDialogText("COLLECTED", item(), "PICKUP");
  assert.equal(collected.title, "Collected SD 2611 0600 01?");
  assert.match(collected.description, /from Delgoda Spice Traders/);
  assert.equal(collected.submit, "Mark as collected");
  assert.equal(collected.success, "SD 2611 0600 01 marked as collected");

  assert.match(flow.outcomeDialogText("LOADED", item({ contact: null }), "TRANSFER").description, /next branch/);
  assert.match(
    flow.outcomeDialogText("LOADED", item({ contact: { ...item().contact!, name: "Kamala Silva" } }), "DELIVERY").description,
    /delivery to Kamala Silva/,
  );
  assert.equal(flow.outcomeDialogText("FAILED", item(), "DELIVERY").submit, "Mark as failed");
});

// ---- Form values → request body (the F1 schemas and builders the dialogs use) ----

test("each form sends only its outcome's fields, trimmed, with an empty note left out", () => {
  assert.deepEqual(schemas.outcomeStepRequest("COLLECTED", schemas.outcomeStepSchema.parse({ note: "  " })), {
    outcome: "COLLECTED",
    note: undefined,
  });
  assert.deepEqual(
    schemas.notTakenRequest("NOT_COLLECTED", schemas.notTakenSchema.parse({ problem: "SENDER_UNAVAILABLE", note: " Shop closed " })),
    { outcome: "NOT_COLLECTED", problem: "SENDER_UNAVAILABLE", note: "Shop closed" },
  );
  assert.deepEqual(schemas.deliveredRequest(schemas.deliveredSchema.parse({ recipientName: " Nimal Perera ", note: "" })), {
    outcome: "DELIVERED",
    recipientName: "Nimal Perera",
    note: undefined,
  });
  assert.deepEqual(schemas.failedRequest(schemas.failedSchema.parse({ failureReason: "WRONG_ADDRESS", note: "" })), {
    outcome: "FAILED",
    failureReason: "WRONG_ADDRESS",
    note: undefined,
  });
});

test("the forms refuse what the API refuses, with the API's messages", () => {
  const issues = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
    Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]));
  assert.deepEqual(issues(schemas.notTakenSchema.safeParse({ problem: "", note: "" })), { problem: "Select why you couldn't take the parcel." });
  assert.deepEqual(issues(schemas.notTakenSchema.safeParse({ problem: "OTHER", note: "" })), { note: "Describe what went wrong." });
  assert.deepEqual(issues(schemas.failedSchema.safeParse({ failureReason: "", note: "" })), { failureReason: "Select why the delivery failed." });
  assert.deepEqual(issues(schemas.deliveredSchema.safeParse({ recipientName: "A", note: "" })), {
    recipientName: "Enter the name of the person who received the parcel.",
  });
});

// ---- Sending ----

test("a saved outcome posts the body and returns the task as the API has it now", async () => {
  const calls = answer(200, taskAfter("COLLECTED", { parcelStatus: "PICKED_UP", readyForHandover: true }));
  const result = await flow.submitOutcome(TASK_ID, PARCEL_ID, { outcome: "COLLECTED", note: "From the front desk" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url.pathname, `/api/v1/courier/assignments/${TASK_ID}/items/${PARCEL_ID}/outcome`);
  assert.deepEqual(calls[0].body, { outcome: "COLLECTED", note: "From the front desk" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.task.items[0].outcome, "COLLECTED");
    assert.equal(result.task.items[0].readyForHandover, true);
  }
});

test("409 ASSIGNMENT_CHANGED: the task changed, so the screen reloads it (nothing was saved)", async () => {
  answer(409, { status: 409, code: "ASSIGNMENT_CHANGED", message: "This task was just changed by someone else. Refresh and try again." });
  const result = await flow.submitOutcome(TASK_ID, PARCEL_ID, { outcome: "COLLECTED" });
  assert.deepEqual(result, {
    ok: false,
    failure: { kind: "reload", title: "This task has changed", message: "This task was just changed by someone else. Refresh and try again." },
  });
});

test("400 with field errors stays in the form; a network failure can be sent again; nothing throws", async () => {
  answer(400, { status: 400, code: "VALIDATION_FAILED", message: "Some fields need attention.", fieldErrors: { recipientName: "Enter the name of the person who received the parcel." } });
  const invalid = await flow.submitOutcome(TASK_ID, PARCEL_ID, { outcome: "DELIVERED", recipientName: "N" });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.failure.kind, "fields");
    assert.deepEqual(invalid.failure.kind === "fields" && invalid.failure.fieldErrors, {
      recipientName: "Enter the name of the person who received the parcel.",
    });
  }

  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed");
  }) as typeof fetch;
  const offline = await flow.submitOutcome(TASK_ID, PARCEL_ID, { outcome: "COLLECTED" });
  assert.equal(offline.ok, false);
  if (!offline.ok) assert.equal(offline.failure.kind, "retry");
});

test("every stale-state code reloads the task; 404 leaves it; anything else can be retried", () => {
  const kind = (status: number, code: string) =>
    flow.outcomeFailure(new ApiError({ status, code: code as never, message: `msg ${code}` }));

  for (const code of ["ASSIGNMENT_CHANGED", "TASK_STEP_NOT_ALLOWED", "INVALID_STATUS_TRANSITION"]) {
    assert.deepEqual(kind(409, code), { kind: "reload", title: "This task has changed", message: `msg ${code}` }, code);
  }
  assert.deepEqual(kind(409, "ASSIGNMENT_CLOSED"), { kind: "reload", title: "This task is closed", message: "msg ASSIGNMENT_CLOSED" });
  assert.equal(kind(404, "NOT_FOUND").kind, "gone");
  assert.equal(kind(500, "INTERNAL_ERROR").kind, "retry");
  assert.equal(kind(403, "FORBIDDEN").kind, "retry");
  assert.equal(flow.outcomeFailure(new Error("boom")).kind, "retry");
});

// ---- The parcel row's buttons ----

const buttons = (markup: string) =>
  [...markup.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map((match) => ({
    text: match[2].replace(/<[^>]+>/g, "").replace("&#x27;", "'"),
    disabled: /\sdisabled=""/.test(match[1]),
  }));

test("the row offers exactly the API's allowedOutcomes, enabled; they wait while something is saving", () => {
  const districtName = (code: string) => code;
  const onStep = () => undefined;

  assert.deepEqual(buttons(renderToStaticMarkup(React.createElement(TaskItemRow, { item: item(), districtName, onStep }))), [
    { text: "Mark as collected", disabled: false },
    { text: "Couldn't collect", disabled: false },
  ]);
  assert.deepEqual(
    buttons(renderToStaticMarkup(React.createElement(TaskItemRow, { item: item(), districtName, onStep, busy: true }))).map((b) => b.disabled),
    [true, true],
  );
  const delivery = item({ parcelStatus: "OUT_FOR_DELIVERY", outcome: "LOADED", allowedOutcomes: ["DELIVERED", "FAILED"] });
  assert.deepEqual(
    buttons(renderToStaticMarkup(React.createElement(TaskItemRow, { item: delivery, districtName, onStep }))).map((b) => b.text),
    ["Mark as delivered", "Mark as failed"],
  );
  // HANDED_OVER / RETURNED are never outcome buttons, even if listed; a closed item has none.
  assert.deepEqual(buttons(renderToStaticMarkup(React.createElement(TaskItemRow, { item: item({ allowedOutcomes: ["HANDED_OVER"] }), districtName, onStep }))), []);
  assert.deepEqual(buttons(renderToStaticMarkup(React.createElement(TaskItemRow, { item: item({ allowedOutcomes: [] }), districtName, onStep }))), []);
});

test("the dialog can't be sent twice or closed while saving, and the task page reloads after each answer", () => {
  // The guards are shared by every task action dialog (action-dialog.tsx); the outcome dialog uses them.
  const shared = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/action-dialog.tsx"), "utf8");
  assert.match(shared, /if \(inFlight\.current\) return;/, "a second press is ignored while a request is running");
  assert.match(shared, /if \(!next && !saving\) onClose\(\);/, "closing waits for the save");
  assert.match(shared, /onEscapeKeyDown=\{\(event\) => saving && event\.preventDefault\(\)\}/);
  const dialog = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/outcome-dialog.tsx"), "utf8");
  assert.match(dialog, /<GuardedDialog/, "the outcome dialog can't be closed while saving");
  assert.match(dialog, /useSingleFlight\(onSavingChange\)/, "the outcome dialog sends one request at a time");
  assert.match(dialog, /submitOutcome\(assignmentId, target\.item\.parcelId, body\)/, "outcomes go through courierApi.recordOutcome");

  const page = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/task-detail-view.tsx"), "utf8");
  assert.match(page, /onRefresh\(updated\)/, "after a save the task is shown as answered and loaded again");
  assert.match(page, /onReload\(\);/, "after a stale-state failure the task is loaded again");
  assert.doesNotMatch(page, /allowedOutcomes\s*=|canMoveTo|nextStatus/, "the page never works out the allowed steps");
});
