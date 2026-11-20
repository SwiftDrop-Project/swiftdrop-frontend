import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * The courier task screens: the display helpers, the task row and the parcel row rendered to HTML,
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
type TaskCardModule = typeof import("../src/features/courier/components/task-card");
type ParcelStatusModule = typeof import("../src/features/courier/lib/parcel-status");
type Summary = import("../src/features/courier/types").CourierTaskSummary;
type Item = import("../src/features/courier/types").CourierTaskItem;

const React = nodeRequire("react") as typeof import("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");
const view = loadTsModule<TaskViewModule>("@/features/courier/lib/task-view");
const { TaskSummaryRow } = loadTsModule<SummaryRowModule>("@/features/courier/components/task-summary-row");
const { TaskItemRow } = loadTsModule<ItemRowModule>("@/features/courier/components/task-item-row");
const { TaskCard } = loadTsModule<TaskCardModule>("@/features/courier/components/task-card");
const parcelStatus = loadTsModule<ParcelStatusModule>("@/features/courier/lib/parcel-status");

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
const badges = (markup: string) =>
  [...markup.matchAll(/<span data-slot="badge"[^>]*>(.*?)<\/span>(?=<|$)/g)].map((match) => match[1].replace(/<[^>]+>/g, ""));
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
  assert.equal(view.progressText({ total: 3, open: 1, closed: 2, problems: 0 }), "2 of 3 parcels updated");
  assert.equal(view.progressText({ total: 1, open: 0, closed: 1, problems: 1 }), "1 of 1 parcel updated · 1 problem");
  assert.equal(view.progressPercent({ total: 3, open: 1, closed: 2, problems: 0 }), 67);
  assert.equal(view.progressPercent({ total: 0, open: 0, closed: 0, problems: 0 }), 0);
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

test("courier work is pickups and deliveries: a transfer is set apart, never shown as one of them", () => {
  const tasks = [
    summary({ assignmentId: "a1" }),
    summary({ assignmentId: "a2", type: "TRANSFER", originBranch: "GAMPAHA", destinationBranch: "MATARA" }),
    summary({ assignmentId: "a3", type: "DELIVERY", originBranch: "MATARA", destinationBranch: null }),
  ];
  const split = view.splitCourierTasks(tasks);
  assert.deepEqual(split.courier.map((t) => t.assignmentId), ["a1", "a3"]);
  assert.deepEqual(split.other.map((t) => t.assignmentId), ["a2"]);
});

test("where a task starts and ends: senders to the branch, or the branch to recipients", () => {
  assert.deepEqual(view.taskLocations(summary(), districtName), {
    fromLabel: "Collect from",
    from: "3 sender addresses",
    toLabel: "Hand over at",
    to: "Gampaha branch",
  });
  assert.deepEqual(
    view.taskLocations(
      summary({ type: "DELIVERY", originBranch: "MATARA", destinationBranch: null, counts: { total: 1, open: 1, closed: 0, problems: 0 } }),
      districtName,
    ),
    { fromLabel: "Collect from", from: "Matara branch", toLabel: "Deliver to", to: "Recipient's address" },
  );
});

// ---- Task card (dashboard) ----

test("a task card links to the task and shows its type, status, day, locations, progress and note", () => {
  const markup = html(React.createElement(TaskCard, { task: summary({ note: "Call before you go" }), today: TODAY, districtName }));
  assert.match(markup, /href="\/courier\/tasks\/c6dd7fdd-ecf6-48b7-8eb5-253117887001"/);
  assert.match(markup, /Pickup task/);
  assert.match(markup, /Not started/);
  assert.match(markup, /Today, 9 Nov 2026/);
  assert.match(markup, /Collect from<\/dt><dd[^>]*>3 sender addresses/);
  assert.match(markup, /Hand over at<\/dt><dd[^>]*>Gampaha branch/);
  assert.match(markup, /0 of 3 parcels updated/);
  assert.match(markup, /role="progressbar"[^>]*aria-valuemax="3"[^>]*aria-valuenow="0"/);
  assert.match(markup, /Note: Call before you go/);
  assert.match(markup, />View task</);
  assert.match(markup, /aria-label="View task: pickup task, Collect from senders, hand over at Gampaha branch, 9 Nov 2026"/);
  assert.doesNotMatch(markup, /Planned for/);
});

test("a task card: a later day shows its date, in progress says Continue, a completed task shows the time", () => {
  assert.match(html(React.createElement(TaskCard, { task: summary({ scheduledFor: "2026-11-12" }), today: TODAY, districtName })), /Planned for 12 Nov 2026/);
  const started = html(
    React.createElement(TaskCard, {
      task: summary({ type: "DELIVERY", status: "IN_PROGRESS", originBranch: "MATARA", destinationBranch: null }),
      today: TODAY,
      districtName,
    }),
  );
  assert.match(started, /Delivery task/);
  assert.match(started, /Collect from<\/dt><dd[^>]*>Matara branch/);
  assert.match(started, /Deliver to<\/dt><dd[^>]*>3 recipient addresses/);
  assert.match(started, />Continue task</);
  const done = html(
    React.createElement(TaskCard, {
      task: summary({ status: "COMPLETED", completedAt: "2026-11-09T08:00:00Z", note: "Old note", counts: { total: 3, open: 0, closed: 3, problems: 0 } }),
      today: TODAY,
      districtName,
    }),
  );
  assert.match(done, /Completed at 1:30 PM/);
  assert.match(done, />View details</);
  assert.doesNotMatch(done, /Old note/, "no dispatcher note once closed");
});

// ---- Task row (history) ----

test("a task row links to the task and shows its type, status, route and progress", () => {
  const markup = html(React.createElement(TaskSummaryRow, { task: summary({ note: "Call before you go" }), today: TODAY, districtName }));
  assert.match(markup, /href="\/courier\/tasks\/c6dd7fdd-ecf6-48b7-8eb5-253117887001"/);
  assert.match(markup, /Pickup task/);
  assert.match(markup, /Not started/);
  assert.match(markup, /Collect from senders, hand over at Gampaha branch/);
  assert.match(markup, /0 of 3 parcels updated/);
  assert.match(markup, /Note: Call before you go/);
  assert.doesNotMatch(markup, /Planned for/);
});

test("a task planned for a later day shows its date", () => {
  const markup = html(React.createElement(TaskSummaryRow, { task: summary({ scheduledFor: "2026-11-12" }), today: TODAY, districtName }));
  assert.match(markup, /Planned for 12 Nov 2026/);
});

// ---- One courier status per parcel ----

test("each parcel gets one courier status, from its outcome in THIS task (not from AT_BRANCH alone)", () => {
  const label = (type: "PICKUP" | "DELIVERY" | "TRANSFER", outcome: Item["outcome"]) => parcelStatus.courierParcelStatus(type, outcome).label;
  assert.equal(label("PICKUP", "PENDING"), "Pending pickup");
  assert.equal(label("PICKUP", "COLLECTED"), "Collected");
  assert.equal(label("PICKUP", "HANDED_OVER"), "Handed over");
  assert.equal(label("PICKUP", "NOT_COLLECTED"), "Not collected");
  assert.equal(label("DELIVERY", "PENDING"), "Ready for delivery");
  assert.equal(label("DELIVERY", "LOADED"), "Out for delivery");
  assert.equal(label("DELIVERY", "DELIVERED"), "Delivered");
  assert.equal(label("DELIVERY", "FAILED"), "Delivery failed");
  assert.equal(label("DELIVERY", "RETURNED"), "Returned to branch");
  assert.equal(label("DELIVERY", "NOT_LOADED"), "Not taken out");
  // A transfer isn't courier work: plain outcome words, never a pickup or delivery status.
  assert.equal(label("TRANSFER", "LOADED"), "Loaded");
  assert.equal(parcelStatus.courierParcelStatus("DELIVERY", "DELIVERED").tone, "success");
  assert.equal(parcelStatus.courierParcelStatus("DELIVERY", "FAILED").tone, "error");

  // The same AT_BRANCH parcel reads differently by context: waiting for delivery, handed over, returned.
  const atBranch = item({ parcelStatus: "AT_BRANCH", allowedOutcomes: [], contact: null });
  const words = (type: "PICKUP" | "DELIVERY", outcome: Item["outcome"]) =>
    badges(html(React.createElement(TaskItemRow, { item: { ...atBranch, outcome }, taskType: type, districtName })));
  assert.deepEqual(words("DELIVERY", "PENDING"), ["Ready for delivery"]);
  assert.deepEqual(words("PICKUP", "HANDED_OVER"), ["Handed over"]);
  assert.deepEqual(words("DELIVERY", "RETURNED"), ["Returned to branch"]);
});

test("the next step in words comes from what the API sent", () => {
  const next = parcelStatus.itemNextStep;
  assert.equal(next("PICKUP", item()), "Collect this parcel from the sender.");
  assert.equal(next("PICKUP", item({ outcome: "COLLECTED", allowedOutcomes: [], readyForHandover: true })), "Ready to hand over at the branch.");
  assert.equal(next("DELIVERY", item({ allowedOutcomes: ["LOADED", "NOT_LOADED"] })), "Take this parcel from the branch when you leave for delivery.");
  assert.equal(next("DELIVERY", item({ outcome: "LOADED", allowedOutcomes: ["DELIVERED", "FAILED"] })), "Deliver to the recipient, then mark it delivered or failed.");
  assert.equal(next("DELIVERY", item({ outcome: "FAILED", allowedOutcomes: [], readyForHandover: true })), "Return this parcel to the branch.");
  assert.equal(next("DELIVERY", item({ outcome: "DELIVERED", allowedOutcomes: [] })), null);
  assert.equal(next("TRANSFER", item({ allowedOutcomes: ["LOADED"] })), null);
});

test("the task page's next step: collect, hand over, deliver, return, complete; nothing for a transfer", () => {
  const detail = (overrides: Partial<Summary> & { items?: Item[] } = {}) => ({ ...summary(), items: [item()], ...overrides });
  assert.equal(view.taskNextStep(detail(), districtName).title, "Collect the parcels");
  assert.equal(
    view.taskNextStep(detail({ status: "IN_PROGRESS", items: [item({ outcome: "COLLECTED", allowedOutcomes: [], readyForHandover: true })] }), districtName).title,
    "Hand over at Gampaha branch",
  );
  const delivery = { type: "DELIVERY" as const, originBranch: "MATARA" as const, destinationBranch: null };
  assert.equal(view.taskNextStep(detail({ ...delivery, items: [item({ allowedOutcomes: ["LOADED", "NOT_LOADED"] })] }), districtName).title, "Deliver the parcels");
  assert.equal(
    view.taskNextStep(detail({ ...delivery, items: [item({ outcome: "FAILED", allowedOutcomes: [], readyForHandover: true })] }), districtName).title,
    "Return to Matara branch",
  );
  assert.equal(view.taskNextStep(detail({ canComplete: true, items: [] }), districtName).title, "Every parcel is updated");
  assert.equal(view.taskNextStep(detail({ status: "COMPLETED" }), districtName).title, "Task completed");
  assert.equal(
    view.taskNextStep(detail({ type: "TRANSFER", originBranch: "GAMPAHA", destinationBranch: "MATARA" }), districtName).title,
    "Branch transfers aren't courier work",
  );
});

// ---- Parcel row (task detail) ----

test("a parcel row shows the steps the API allows (disabled without a handler) and links to the parcel", () => {
  const markup = html(React.createElement(TaskItemRow, { item: item(), taskType: "PICKUP", districtName }));
  assert.match(markup, /href="\/courier\/parcels\/ab598d39-d554-42f5-b609-6fa90f3a5357"/);
  assert.match(markup, /1\. SD 2611 0600 01/);
  assert.deepEqual(badges(markup), ["Pending pickup"], "one status per parcel");
  assert.match(markup, /Collect from \(sender\)/);
  assert.match(markup, /Collect this parcel from the sender\./);
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
      taskType: "PICKUP",
      districtName,
    }),
  );
  assert.deepEqual(buttons(collected), []);
  assert.deepEqual(badges(collected), ["Collected"]);
  assert.match(collected, /Ready to hand over at the branch\./);
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
      taskType: "DELIVERY",
      districtName,
    }),
  );
  assert.match(failed, /Collect Rs\.\s?2,500(\.00)? in cash/);
  assert.match(failed, /Recipient not available/);
  assert.deepEqual(badges(failed), ["Delivery failed"]);
  assert.match(failed, /Return this parcel to the branch\./);
  assert.match(failed, /Deliver to \(recipient\)/);

  const waiting = html(
    React.createElement(TaskItemRow, { item: item({ parcelStatus: "AT_BRANCH", allowedOutcomes: ["LOADED", "NOT_LOADED"] }), taskType: "DELIVERY", districtName }),
  );
  assert.deepEqual(badges(waiting), ["Ready for delivery"]);
  assert.deepEqual(buttons(waiting).map((b) => b.text), ["Mark out for delivery", "Couldn&#x27;t take out"]);

  // A transfer the API sent anyway: no buttons, no pickup or delivery words, no contact.
  const transfer = html(
    React.createElement(TaskItemRow, {
      item: item({ contact: null, allowedOutcomes: ["LOADED", "NOT_LOADED"] }),
      taskType: "TRANSFER",
      districtName,
      readOnly: true,
    }),
  );
  assert.doesNotMatch(transfer, /Delgoda Spice Traders/);
  assert.deepEqual(buttons(transfer), []);
  assert.deepEqual(badges(transfer), ["Waiting"]);
  assert.match(transfer, /Delgoda, Gampaha → Deniyaya, Matara/);
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
