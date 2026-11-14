import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * The courier task screens (F2A, read only): the display helpers, the task row and the parcel row rendered to HTML,
 * and the route pages' guard and dynamic-route conventions. Fixtures follow API.md "Courier".
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");
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

type TaskViewModule = typeof import("../src/features/courier/lib/task-view");
type SummaryRowModule = typeof import("../src/features/courier/components/task-summary-row");
type ItemRowModule = typeof import("../src/features/courier/components/task-item-row");
type Summary = import("../src/features/courier/types").CourierTaskSummary;
type Item = import("../src/features/courier/types").CourierTaskItem;

const React = nodeRequire("react") as typeof import("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");
const view = loadTsModule<TaskViewModule>("@/features/courier/lib/task-view");
const { TaskSummaryRow } = loadTsModule<SummaryRowModule>("@/features/courier/components/task-summary-row");
const { TaskItemRow } = loadTsModule<ItemRowModule>("@/features/courier/components/task-item-row");

const districtName = (code: string) => code.charAt(0) + code.slice(1).toLowerCase();
const TODAY = "2026-11-09";

const summary = (overrides: Partial<Summary> = {}): Summary => ({
  assignmentId: "c6dd7fdd-ecf6-48b7-8eb5-253117887001",
  type: "PICKUP",
  status: "ASSIGNED",
  originBranch: null,
  destinationBranch: "GAMPAHA",
  scheduledFor: TODAY,
  note: null,
  assignedAt: "2026-11-09T02:30:00Z",
  completedAt: null,
  counts: { total: 3, open: 3, closed: 0, problems: 0 },
  canComplete: false,
  ...overrides,
});

const item = (overrides: Partial<Item> = {}): Item => ({
  parcelId: "ab598d39-d554-42f5-b609-6fa90f3a5357",
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

const html = (element: React.ReactElement) => renderToStaticMarkup(element);
const buttons = (markup: string) =>
  [...markup.matchAll(/<button[^>]*?(disabled="")?[^>]*>(.*?)<\/button>/g)].map((match) => ({
    text: match[2].replace(/<[^>]+>/g, ""),
    disabled: /disabled=""/.test(match[0]),
  }));

// ---- Display helpers ----

test("today's tasks are grouped by the API's status, keeping the API's order", () => {
  const tasks = [
    summary({ assignmentId: "a1", status: "IN_PROGRESS" }),
    summary({ assignmentId: "a2", status: "ASSIGNED" }),
    summary({ assignmentId: "a3", status: "ASSIGNED", scheduledFor: "2026-11-12" }),
    summary({ assignmentId: "a4", status: "COMPLETED" }),
    summary({ assignmentId: "a5", status: "CANCELLED" }),
  ];
  const groups = view.groupTodayTasks(tasks);
  assert.deepEqual(groups.inProgress.map((t) => t.assignmentId), ["a1"]);
  assert.deepEqual(groups.assigned.map((t) => t.assignmentId), ["a2", "a3"]);
  assert.deepEqual(groups.doneToday.map((t) => t.assignmentId), ["a4", "a5"]);
});

test("progress, later days and routes in words", () => {
  assert.equal(view.progressText({ total: 3, open: 1, closed: 2, problems: 0 }), "2 of 3 parcels done");
  assert.equal(view.progressText({ total: 1, open: 0, closed: 1, problems: 1 }), "1 of 1 parcel done · 1 problem");
  assert.equal(view.isLaterDay("2026-11-12", TODAY), true);
  assert.equal(view.isLaterDay(TODAY, TODAY), false);
  assert.equal(view.taskRouteText(summary(), districtName), "Collect from senders, hand over at Gampaha branch");
  assert.equal(
    view.taskRouteText(summary({ type: "TRANSFER", originBranch: "GAMPAHA", destinationBranch: "MATARA" }), districtName),
    "Gampaha branch to Matara branch",
  );
  assert.equal(
    view.taskRouteText(summary({ type: "DELIVERY", originBranch: "MATARA", destinationBranch: null }), districtName),
    "Deliver to recipients from Matara branch",
  );
});

// ---- Task row (dashboard) ----

test("a task row links to the task and shows its type, status, route and progress", () => {
  const markup = html(React.createElement(TaskSummaryRow, { task: summary({ note: "Call before you go" }), today: TODAY, districtName }));
  assert.match(markup, /href="\/courier\/tasks\/c6dd7fdd-ecf6-48b7-8eb5-253117887001"/);
  assert.match(markup, /Pickup task/);
  assert.match(markup, /Not started/);
  assert.match(markup, /Collect from senders, hand over at Gampaha branch/);
  assert.match(markup, /0 of 3 parcels done/);
  assert.match(markup, /Note: Call before you go/);
  assert.doesNotMatch(markup, /Planned for/);
});

test("a task planned for a later day shows its date", () => {
  const markup = html(React.createElement(TaskSummaryRow, { task: summary({ scheduledFor: "2026-11-12" }), today: TODAY, districtName }));
  assert.match(markup, /Planned for 12 Nov 2026/);
});

// ---- Parcel row (task detail) ----

test("a parcel row shows the steps the API allows, disabled until F2B, and links to the parcel", () => {
  const markup = html(React.createElement(TaskItemRow, { item: item(), districtName }));
  assert.match(markup, /href="\/courier\/parcels\/ab598d39-d554-42f5-b609-6fa90f3a5357"/);
  assert.match(markup, /1\. SD 2611 0600 01/);
  assert.match(markup, /Waiting/);
  assert.match(markup, /Pending pickup/);
  assert.match(markup, /Delgoda Spice Traders/);
  assert.match(markup, /href="tel:\+94760000101"/);
  assert.deepEqual(buttons(markup), [
    { text: "Mark as collected", disabled: true },
    { text: "Couldn&#x27;t collect", disabled: true },
  ]);
  assert.doesNotMatch(markup, /Ready to hand over/);
});

test("a parcel row shows only what the API sends: no steps, handover readiness, cash, outcome details", () => {
  const collected = html(
    React.createElement(TaskItemRow, {
      item: item({ outcome: "COLLECTED", parcelStatus: "PICKED_UP", allowedOutcomes: [], readyForHandover: true, note: "From the front desk" }),
      districtName,
    }),
  );
  assert.deepEqual(buttons(collected), []);
  assert.match(collected, /Ready to hand over/);
  assert.match(collected, /Your note: From the front desk/);

  const failed = html(
    React.createElement(TaskItemRow, {
      item: item({
        outcome: "FAILED",
        parcelStatus: "FAILED",
        allowedOutcomes: [],
        readyForHandover: true,
        codAmount: 2500,
        failureReason: "RECIPIENT_UNAVAILABLE",
      }),
      districtName,
    }),
  );
  assert.match(failed, /Collect Rs\.\s?2,500(\.00)? in cash/);
  assert.match(failed, /Recipient not available/);

  const transfer = html(React.createElement(TaskItemRow, { item: item({ contact: null, allowedOutcomes: ["LOADED", "NOT_LOADED"] }), districtName }));
  assert.doesNotMatch(transfer, /Delgoda Spice Traders/);
  assert.deepEqual(buttons(transfer).map((b) => b.text), ["Mark as loaded", "Couldn&#x27;t load"]);
});

// ---- Route pages ----

test("the new courier pages are guarded, not async, and read their ids with useParams", () => {
  const pages = {
    "app/courier/page.tsx": "CourierTodayTasks",
    "app/courier/tasks/[assignmentId]/page.tsx": "CourierTaskView",
    "app/courier/parcels/[parcelId]/page.tsx": "CourierParcelView",
  };
  for (const [page, component] of Object.entries(pages)) {
    const source = fs.readFileSync(path.join(SRC_ROOT, page), "utf8");
    assert.match(source, /<RequireCurrentUser/, `${page} renders RequireCurrentUser`);
    assert.match(source, new RegExp(`<${component}\\s*/>`), `${page} renders ${component}`);
    assert.doesNotMatch(source, /export\s+const\s+instant/, `${page} keeps instant navigation`);
    assert.doesNotMatch(source, /async\s+function/, `${page} is not async`);
  }
  for (const [file, param] of [
    ["features/courier/components/task-detail-view.tsx", "assignmentId"],
    ["features/courier/components/parcel-detail-view.tsx", "parcelId"],
  ]) {
    const source = fs.readFileSync(path.join(SRC_ROOT, file), "utf8");
    assert.match(source, /^"use client";/, `${file} is a client component`);
    assert.match(source, new RegExp(`useParams<\\{ ${param}\\?: string \\}>`), `${file} reads ${param} with useParams`);
  }
});
