import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * The courier parcel screens: one card per parcel (never one per task), Active and Completed from the backend's
 * `completed`, individual completion while sibling parcels stay active, cancelled parcels, contact privacy, and the
 * route pages' guard and dynamic-route conventions. Fixtures follow API.md "Courier".
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

function readSource(relative: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relative), "utf8");
}

type Delivery = import("../src/features/courier/types").CourierDelivery;
type DeliveryDetail = import("../src/features/courier/types").CourierDeliveryDetail;
type Task = import("../src/features/courier/types").CourierTask;

const TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887001";
const OTHER_TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887002";
const PARCEL_ID = "ab598d39-d554-42f5-b609-6fa90f3a5357";
const SIBLING_ID = "4d15dee6-ad98-4ac0-91a5-fb8d08659571";

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

const districtName = (code: string) => code.charAt(0) + code.slice(1).toLowerCase();

type ViewModule = typeof import("../src/features/courier/lib/parcel-view");
type StatusModule = typeof import("../src/features/courier/lib/parcel-status");
type CardModule = typeof import("../src/features/courier/components/parcel-card");

const React = nodeRequire("react") as typeof import("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");
const view = loadTsModule<ViewModule>("@/features/courier/lib/parcel-view");
const status = loadTsModule<StatusModule>("@/features/courier/lib/parcel-status");
const { ParcelCard } = loadTsModule<CardModule>("@/features/courier/components/parcel-card");
type ProofModule = typeof import("../src/features/courier/components/proof-of-delivery");
process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";
const { ProofOfDeliveryCard } = loadTsModule<ProofModule>("@/features/courier/components/proof-of-delivery");
const proofCard = (item: Pick<Delivery, "parcelId" | "proof" | "completedAt">) =>
  renderToStaticMarkup(React.createElement(ProofOfDeliveryCard, { delivery: item }));

const card = (item: Delivery) =>
  renderToStaticMarkup(React.createElement("ul", null, React.createElement(ParcelCard, { delivery: item, districtName, onAction: () => undefined })));

/** A card's HTML without its copy-tracking-number button (a button, but never a parcel action). */
const withoutCopyButton = (html: string) =>
  html.replace(/<button[^>]*aria-label="Copy tracking number[^"]*"[\s\S]*?<\/button>/g, "");

/** One task (assignment) with three parcels: one handed over (completed), one picked up, one still to pick up. */
const handedOver = pickup(
  {
    parcelId: SIBLING_ID,
    trackingNumber: "SD2611004818",
    status: "AT_BRANCH",
    pickup: null,
    nextStatuses: [],
    canMarkUnableToCollect: false,
    completed: true,
    completedAt: "2026-11-05T04:00:00Z",
  },
  { status: "IN_PROGRESS", outcome: "HANDED_OVER", receivedBy: "S. Silva" },
);
const pickedUp = pickup(
  {
    parcelId: "11111111-1111-4111-8111-111111111111",
    trackingNumber: "SD2611004819",
    status: "PICKED_UP",
    nextStatuses: ["AT_BRANCH"],
    canMarkUnableToCollect: false,
  },
  { status: "IN_PROGRESS", outcome: "COLLECTED" },
);
const toPickUp = pickup({}, { status: "IN_PROGRESS" });

// ---- Active and Completed come from `completed`, never from the parcel or task status ----

test("groupToday: Active and Completed from `completed`; siblings of one task land on their own", () => {
  const out = delivery({ parcelId: "22222222-2222-4222-8222-222222222222" });
  const groups = view.groupToday([toPickUp, pickedUp, out, handedOver]);
  assert.deepEqual(groups.pickups.map((item) => item.parcelId), [toPickUp.parcelId, pickedUp.parcelId], "API order kept");
  assert.deepEqual(groups.deliveries.map((item) => item.parcelId), [out.parcelId]);
  assert.deepEqual(groups.completed.map((item) => item.parcelId), [SIBLING_ID]);
  assert.deepEqual(groups.closed, []);
  // All three pickups are in the same task: one is completed while the other two stay active.
  assert.equal(new Set([toPickUp, pickedUp, handedOver].map((item) => item.task.assignmentId)).size, 1);
});

test("PICKED_UP and FAILED are not completed: they stay active until the handover or the return", () => {
  const failed = delivery(
    { status: "FAILED", recipient: RECIPIENT, nextStatuses: ["AT_BRANCH"] },
    { outcome: "FAILED" },
  );
  assert.equal(status.parcelPhase(pickedUp), "active");
  assert.equal(status.parcelPhase(failed), "active");
  assert.deepEqual(view.groupToday([failed]).deliveries.map((item) => item.parcelId), [failed.parcelId]);
  // A parcel AT_BRANCH is not "handed over" by itself: only the backend's `completed` says so.
  assert.equal(status.parcelPhase(pickup({ status: "AT_BRANCH" }, { outcome: "COLLECTED" })), "active");
});

test("a whole task COMPLETED or CANCELLED doesn't make an unfinished parcel completed work", () => {
  const cancelled = pickup({ nextStatuses: [], canMarkUnableToCollect: false, pickup: null }, { status: "CANCELLED" });
  assert.equal(status.parcelPhase(cancelled), "closed");
  assert.deepEqual(status.deliveryStatus(cancelled), { label: "Cancelled", tone: "neutral" });
  const groups = view.groupToday([cancelled]);
  assert.deepEqual(groups.completed, [], "never in Completed");
  assert.deepEqual(groups.closed.map((item) => item.parcelId), [cancelled.parcelId]);
  assert.equal(view.parcelNextStep(cancelled, districtName), null);
  assert.match(view.outcomeDetails(cancelled).join(" "), /dispatcher cancelled this task before you finished/);
  // The reverse: a completed parcel is completed whatever its task's status.
  assert.equal(status.parcelPhase({ ...handedOver, task: { ...handedOver.task, status: "IN_PROGRESS" } }), "completed");
});

test("applyParcelUpdate: only the updated parcel changes; counts move when it is completed", () => {
  const today = { date: "2026-11-05", toDo: 2, done: 1, items: [toPickUp, pickedUp, handedOver] };
  const nowHandedOver = detail(
    pickup(
      { ...pickedUp, status: "AT_BRANCH", pickup: null, nextStatuses: [], completed: true, completedAt: "2026-11-05T05:00:00Z" },
      { status: "IN_PROGRESS", outcome: "HANDED_OVER", receivedBy: "K. Perera" },
    ),
  );
  const after = view.applyParcelUpdate(today, nowHandedOver);
  assert.equal(after.toDo, 1);
  assert.equal(after.done, 2);
  assert.equal(after.items[1].completed, true);
  assert.ok(!("history" in after.items[1]), "list entries keep the list fields only");
  assert.deepEqual(after.items[0], toPickUp, "the sibling still to pick up is untouched");
  assert.equal(after.items[0].completed, false);

  // A step that doesn't complete the parcel (picked up) moves no count.
  const picked = view.applyParcelUpdate(
    today,
    detail(pickup({ status: "PICKED_UP", nextStatuses: ["AT_BRANCH"], canMarkUnableToCollect: false }, { status: "IN_PROGRESS", outcome: "COLLECTED" })),
  );
  assert.equal(picked.toDo, 2);
  assert.equal(picked.done, 1);
  assert.equal(view.groupToday(picked.items).pickups.length, 2);
});

test("deliveryKey tells apart the same parcel in two tasks", () => {
  const first = delivery({}, { assignmentId: TASK_ID });
  const second = delivery({}, { assignmentId: OTHER_TASK_ID });
  assert.notEqual(view.deliveryKey(first), view.deliveryKey(second));
});

// ---- The card ----

test("ParcelCard: one parcel with its tracking number, type, status, places, contact and the API's actions", () => {
  const html = card(toPickUp);
  assert.match(html, /SD 2611 0048 17/);
  assert.match(html, /Pickup · 1\.2 kg/);
  assert.match(html, /Pending pickup/);
  assert.match(html, /Delgoda, Gampaha/);
  assert.match(html, /Collect from \(sender\)/);
  assert.match(html, /Delgoda Spice Traders/);
  assert.match(html, /href="tel:\+94760000101"/);
  assert.match(html, /Mark picked up/);
  assert.match(html, /Unable to Collect/);
  // No routine next-step line or instructions box on the card (both stay on the parcel page).
  assert.doesNotMatch(html, /Collect this parcel from the sender\./);
  assert.doesNotMatch(html, /Instructions:/);
  assert.match(html, /href="\/courier\/parcels\/ab598d39-d554-42f5-b609-6fa90f3a5357"/);
  assert.doesNotMatch(html, /Complete task/i, "no manual completion");
  assert.doesNotMatch(html, /\/courier\/tasks\//, "no task page links");
});

test("ParcelCard: only the actions in nextStatuses, and Unable to Collect only while allowed", () => {
  const html = card(pickedUp);
  assert.match(html, /Hand over at branch/);
  assert.doesNotMatch(html, /Mark picked up/);
  assert.doesNotMatch(html, /Unable to Collect/, "hidden when canMarkUnableToCollect is false");
  assert.doesNotMatch(html, /Hand this parcel over at Gampaha branch\./);

  const out = card(delivery());
  // The short card labels (the buttons, not a status word).
  assert.match(out, /Delivered<\/button>/);
  assert.match(out, /Failed<\/button>/);
  assert.match(out, /Collect Rs\.\s?2,450\.00 in cash/);
  assert.match(out, /Deliver to \(recipient\)/);
  assert.match(out, /Nimal Perera/);

  const nothing = card(pickup({ nextStatuses: [], canMarkUnableToCollect: false }));
  assert.doesNotMatch(withoutCopyButton(nothing), /<button/, "no buttons when the API offers no action");
});

test("ParcelCard: a completed parcel shows no contact and no actions, only how it ended", () => {
  const html = card(handedOver);
  assert.match(html, /Handed over/);
  assert.match(html, /Completed at/);
  assert.match(html, /Received at the branch by S\. Silva/);
  assert.doesNotMatch(html, /Delgoda Spice Traders/, "no contact once completed");
  assert.doesNotMatch(html, /tel:/);
  assert.doesNotMatch(withoutCopyButton(html), /<button/);
});

test("ParcelCard: nullable contacts and places are safe (no recipient sent, missing from/to)", () => {
  const html = card(delivery({ recipient: null, from: null, to: null }));
  assert.match(html, /Delivery · /);
  assert.match(html, /Not given/);
  assert.doesNotMatch(html, /tel:/);
  assert.doesNotMatch(html, /Deliver to \(recipient\)/, "no contact block without a contact");
  assert.match(html, /Delivered<\/button>/);
});

/** A branch transfer, as the backend could still send one (its `stop` is DELIVERY). */
const transfer = delivery(
  { parcelId: "44444444-4444-4444-8444-444444444444", recipient: null, codAmount: null, status: "AT_BRANCH", nextStatuses: ["IN_TRANSIT"], canMarkUnableToCollect: true },
  { type: "TRANSFER", outcome: "PENDING", status: "ASSIGNED", branch: "KANDY" },
);

test("a transfer is never courier work: not in Deliveries, Completed or the counts; no actions, no next step", () => {
  const completedTransfer = { ...transfer, parcelId: "55555555-5555-4555-8555-555555555555", completed: true, completedAt: "2026-11-05T06:00:00Z", nextStatuses: [], canMarkUnableToCollect: false, task: { ...transfer.task, outcome: "HANDED_OVER" as const } };
  const groups = view.groupToday([toPickUp, transfer, delivery(), completedTransfer, handedOver]);
  assert.deepEqual(groups.deliveries.map((item) => item.parcelId), [PARCEL_ID], "the transfer isn't a delivery");
  assert.deepEqual(groups.completed.map((item) => item.parcelId), [SIBLING_ID], "a completed transfer isn't completed work");
  assert.deepEqual(groups.unsupported.map((item) => item.parcelId), [transfer.parcelId, completedTransfer.parcelId]);
  assert.equal(status.parcelPhase(transfer), "unsupported");
  assert.equal(status.parcelPhase(completedTransfer), "unsupported");
  assert.deepEqual(status.deliveryStatus(transfer), { label: "Branch transfer", tone: "neutral" });
  assert.equal(view.parcelNextStep(transfer, districtName), null);
  assert.equal(view.deliveryContact(transfer), null);
  assert.equal(view.contactLabel(transfer), "Contact", "never labelled as a delivery");
  assert.deepEqual(view.splitCourierWork([transfer, toPickUp]).courier.map((item) => item.parcelId), [toPickUp.parcelId]);

  const html = card(transfer);
  assert.doesNotMatch(withoutCopyButton(html), /<button/, "no actions, even though the API listed IN_TRANSIT and Unable to Collect");
  assert.doesNotMatch(html, /Load for transfer|Unable to Collect|Deliver to|Ready for delivery/);
  assert.match(html, /Branch transfer/);
});

test("today's page counts only pickups and deliveries and puts transfers in a notice", () => {
  const today = readSource("features/courier/components/today-parcels.tsx");
  // Four counts, in this order, all from today's parcels (one per parcel, never per task, no extra request).
  const stats = [...today.matchAll(/<Stat icon=\{(\w+)\} label="([^"]+)" value=\{([^}]+)\}( tone="success")? \/>/g)].map(
    ([, icon, label, value, tone]) => [icon, label, value, tone ?? ""],
  );
  assert.deepEqual(stats, [
    ["ListTodo", "To do", "activeCount", ""],
    ["PackagePlus", "Pickups to do", "groups.pickups.length", ""],
    ["Truck", "Deliveries to do", "groups.deliveries.length", ""],
    ["CircleCheck", "Done today", "groups.completed.length", ' tone="success"'],
  ]);
  assert.match(today, /const activeCount = groups\.pickups\.length \+ groups\.deliveries\.length;/);
  assert.match(today, /grid-cols-2 gap-3 lg:grid-cols-4/);
  // Parcel cards (all sections and the skeleton): columns from the content width the section gets, not the screen.
  // A column is added only when each card keeps >= 21.5rem inside (the buttons' shared side-by-side width).
  assert.match(today, /const PARCEL_GRID = "grid grid-cols-1 gap-4 @\[49\.5rem\]:grid-cols-2 @\[74\.5rem\]:grid-cols-3";/);
  assert.equal(today.match(/className=\{PARCEL_GRID\}/g)?.length, 2, "the parcel sections and the loading skeleton");
  assert.equal(today.match(/@container flex flex-col gap-3/g)?.length, 2);
  assert.match(today, /groups\.unsupported\.length > 0/);
  assert.match(today, /Branch transfers aren&apos;t courier work/);
  // Tab focus drawn inside the tab (the tab row clips an outside outline to a stray vertical line); local, not shared.
  assert.match(today, /const TAB_FOCUS = "rounded-t-sm focus-visible:-outline-offset-2";/);
  assert.equal(today.match(/<TabsTrigger value="(active|completed)" className=\{TAB_FOCUS\}>/g)?.length, 2);
});

test("today's counts: a collected pickup and a failed delivery are still to do; finished parcels never are", () => {
  const items = [
    delivery({ status: "CREATED", nextStatuses: ["PICKED_UP"], canMarkUnableToCollect: true }, { type: "PICKUP", outcome: "PENDING" }),
    delivery({ status: "PICKED_UP", nextStatuses: ["AT_BRANCH"] }, { type: "PICKUP", outcome: "COLLECTED", status: "IN_PROGRESS" }),
    delivery({ status: "FAILED", nextStatuses: ["AT_BRANCH"] }, { type: "DELIVERY", outcome: "FAILED", status: "IN_PROGRESS" }),
    delivery({ status: "AT_BRANCH", nextStatuses: ["OUT_FOR_DELIVERY"], canMarkUnableToCollect: true }, { type: "DELIVERY", outcome: "PENDING" }),
    delivery(
      { status: "DELIVERED", nextStatuses: [], completed: true, completedAt: "2026-11-21T05:01:01Z" },
      { type: "DELIVERY", outcome: "DELIVERED", status: "COMPLETED" },
    ),
  ].map((item, index) => ({ ...item, parcelId: `p${index}`, task: { ...item.task, assignmentId: `t${index}` } }));
  const groups = view.groupToday(items);
  assert.equal(groups.pickups.length, 2);
  assert.equal(groups.deliveries.length, 2);
  assert.equal(groups.completed.length, 1);
});

test("ParcelCard: one shared action row; every pair uses the same side-by-side width, so a row never mixes layouts", () => {
  const pickup = card(
    delivery({ status: "CREATED", nextStatuses: ["PICKED_UP"], canMarkUnableToCollect: true }, { type: "PICKUP", outcome: "PENDING" }),
  );
  // Two subgrid rows (body, action section) shared with the other cards of the grid row: dividers line up.
  assert.match(pickup, /row-span-2 grid min-w-0 grid-rows-subgrid/);
  assert.match(pickup, /row-span-2 grid grid-rows-subgrid/);
  assert.match(pickup, /flex min-w-0 flex-col gap-2 border-t/);
  assert.match(pickup, /@container/);
  assert.ok(pickup.indexOf("Mark picked up") < pickup.indexOf("Unable to Collect"), "the main action comes first");
  assert.ok(pickup.indexOf("Unable to Collect") < pickup.indexOf("View parcel"), "View parcel sits under the actions");
  assert.match(pickup, /mt-auto h-11 self-center/, "View parcel is centred at the bottom of the action section");
  const loading = card(
    delivery({ status: "AT_BRANCH", nextStatuses: ["OUT_FOR_DELIVERY"], canMarkUnableToCollect: true }, { type: "DELIVERY", outcome: "PENDING" }),
  );
  assert.match(loading, /Out for delivery<\/button>/);
  const loaded = card(
    delivery({ status: "OUT_FOR_DELIVERY", nextStatuses: ["DELIVERED", "FAILED"] }, { type: "DELIVERY", outcome: "LOADED", status: "IN_PROGRESS" }),
  );
  assert.ok(loaded.indexOf("Delivered</button>") < loaded.indexOf("Failed</button>"));
  for (const html of [pickup, loading, loaded]) {
    const widths = [...html.matchAll(/@\[([0-9.]+)rem\]:grid-cols-2/g)].map((match) => match[1]);
    assert.deepEqual(widths, ["21.5"], "the same threshold for every pair");
  }
  const handover = card(
    delivery({ status: "PICKED_UP", nextStatuses: ["AT_BRANCH"] }, { type: "PICKUP", outcome: "COLLECTED", status: "IN_PROGRESS" }),
  );
  assert.match(handover, /Hand over at branch/);
  assert.doesNotMatch(handover, /grid-cols-2/, "a single action always takes the full width");
});

test("ParcelCard: a parcel not at the branch yet offers only Unable to Collect, and says why", () => {
  const waiting = delivery(
    { status: "AT_BRANCH", nextStatuses: [], canMarkUnableToCollect: true },
    { outcome: "PENDING", status: "ASSIGNED" },
  );
  const html = card(waiting);
  assert.match(html, /isn&#x27;t at Colombo branch yet/);
  assert.match(html, /Unable to Collect/);
  // The button (not the status word, which a badge may also show).
  assert.doesNotMatch(html, /Out for delivery<\/button>/);
});

test("parcelNextStep words each step from nextStatuses", () => {
  assert.equal(view.parcelNextStep(toPickUp, districtName), "Collect this parcel from the sender.");
  assert.equal(
    view.parcelNextStep(delivery({ nextStatuses: ["OUT_FOR_DELIVERY"] }, { outcome: "PENDING" }), districtName),
    "Take this parcel from Colombo branch when you leave for delivery.",
  );
  assert.equal(
    view.parcelNextStep(delivery({ status: "FAILED", nextStatuses: ["AT_BRANCH"] }, { outcome: "FAILED" }), districtName),
    "Delivery failed: return this parcel to Colombo branch.",
  );
  assert.equal(view.parcelNextStep(handedOver, districtName), null);
});

// ---- Route pages ----

test("the courier pages are guarded, not async, keep instant navigation, and read the parcel id with useParams", () => {
  const pages = {
    "app/courier/page.tsx": "CourierTodayParcels",
    "app/courier/parcels/[parcelId]/page.tsx": "CourierParcelView",
    "app/courier/history/page.tsx": "CourierParcelHistory",
  };
  for (const [page, component] of Object.entries(pages)) {
    const source = readSource(page);
    assert.match(source, /<RequireCurrentUser/, `${page} renders RequireCurrentUser`);
    assert.match(source, new RegExp(`<${component}\\s*/>`), `${page} renders ${component}`);
    assert.doesNotMatch(source, /export\s+const\s+instant/, `${page} keeps instant navigation`);
    assert.doesNotMatch(source, /async\s+function/, `${page} is not async`);
  }
  const detailView = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(detailView, /^"use client";/);
  assert.match(detailView, /useParams<\{ parcelId\?: string \}>/);
  assert.equal(fs.existsSync(path.join(SRC_ROOT, "app/courier/tasks")), false, "no assignment-detail route");
});

test("no manual task completion anywhere in the courier feature", () => {
  const dir = path.join(SRC_ROOT, "features/courier");
  const files = fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name));
  for (const entry of files) {
    const source = fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8");
    assert.doesNotMatch(source, /Complete task|CompleteTaskDialog|canComplete/, `${entry.name} has no manual completion`);
  }
});

// ---- Proof of delivery ----

test("a completed delivery shows its proof: who received it, and the private photo with View proof (no repeated time)", () => {
  const html = proofCard({ parcelId: PARCEL_ID, completedAt: "2026-11-05T07:00:00Z", proof: { recipientName: "Nimal Perera", hasPhoto: true } });
  assert.match(html, /Proof of delivery/);
  assert.match(html, /Received by/);
  assert.match(html, /Nimal Perera/);
  // The delivery time is in the summary and the history, not repeated here.
  assert.doesNotMatch(html, />Delivered</);
  assert.doesNotMatch(html, /2026|Nov/);
  const src = `http://api.test/api/v1/courier/deliveries/${PARCEL_ID}/proof`;
  assert.ok(html.includes(`src="${src}"`), "loaded from the backend with the login cookie");
  assert.match(html, /View proof/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /cloudinary/i, "no storage URL ever reaches the screen");
});

test("no photo, or not delivered yet: no image", () => {
  const without = proofCard({ parcelId: PARCEL_ID, completedAt: "2026-11-05T07:00:00Z", proof: { recipientName: "Nimal Perera", hasPhoto: false } });
  assert.match(without, /No photo is attached/);
  assert.doesNotMatch(without, /<img/);
  assert.equal(proofCard({ parcelId: PARCEL_ID, completedAt: null, proof: null }), "");
});

test("a delivered card says who received it and that the proof photo is attached", () => {
  const html = card(delivery(
    { status: "DELIVERED", recipient: null, nextStatuses: [], completed: true, completedAt: "2026-11-05T07:00:00Z", proof: { recipientName: "Nimal Perera", hasPhoto: true } },
    { outcome: "DELIVERED" },
  ));
  assert.match(html, /Received by Nimal Perera/);
  assert.match(html, /Proof of delivery photo attached/);
  const detailView = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(detailView, /phase === "completed" \? <ProofOfDeliveryCard delivery=\{delivery\} \/> : null/);
});

// ---- The courier's assigned route (this task's leg), never the parcel's whole journey ----

test("assignedRoute: pickup = sender place → task branch; delivery = task branch → recipient place", () => {
  const pickup = delivery({ status: "CREATED", from: { city: "Kadawatha", district: "GAMPAHA" }, to: { city: "Negombo", district: "GAMPAHA" } }, { type: "PICKUP", branch: "GAMPAHA", outcome: "PENDING" });
  assert.deepEqual(view.assignedRoute(pickup, districtName), { from: "Kadawatha, Gampaha", to: "Gampaha branch" });
  assert.equal(view.assignedRouteText(pickup, districtName), "Kadawatha, Gampaha → Gampaha branch");

  const out = delivery({ from: { city: "Kiribathgoda", district: "GAMPAHA" }, to: { city: "Minuwangoda", district: "GAMPAHA" } }, { type: "DELIVERY", branch: "GAMPAHA" });
  assert.deepEqual(view.assignedRoute(out, districtName), { from: "Gampaha branch", to: "Minuwangoda, Gampaha" });

  // The branch comes from the task, never from the sender's or recipient's district.
  const elsewhere = delivery({ to: { city: "Kandy", district: "KANDY" } }, { type: "DELIVERY", branch: "COLOMBO" });
  assert.equal(view.assignedRoute(elsewhere, districtName).from, "Colombo branch");
  const noBranch = delivery({}, { type: "PICKUP", branch: null });
  assert.equal(view.assignedRoute(noBranch, districtName).to, "Branch not given");
  // A failed delivery waiting to be returned keeps its delivery route (the next step names the branch).
  const failed = delivery({ status: "FAILED", nextStatuses: ["AT_BRANCH"] }, { type: "DELIVERY", outcome: "FAILED", status: "IN_PROGRESS", branch: "COLOMBO" });
  assert.deepEqual(view.assignedRoute(failed, districtName), { from: "Colombo branch", to: "Kandy" });
  assert.equal(view.parcelNextStep(failed, districtName), "Delivery failed: return this parcel to Colombo branch.");
});

test("ParcelCard: From/To show the assigned route; the contact keeps the full address without repeating names", () => {
  const pickup = card(
    delivery(
      { status: "PICKED_UP", nextStatuses: ["AT_BRANCH"], pickup: SENDER, recipient: null, from: { city: "Delgoda", district: "GAMPAHA" }, to: { city: "Negombo", district: "GAMPAHA" } },
      { type: "PICKUP", outcome: "COLLECTED", status: "IN_PROGRESS", branch: "GAMPAHA" },
    ),
  );
  assert.match(pickup, />Delgoda, Gampaha</);
  assert.match(pickup, />Gampaha branch</);
  assert.doesNotMatch(pickup, /Negombo/, "a pickup card never shows the recipient's place");
  assert.match(pickup, /14 Kandy Road, Delgoda, Gampaha/);

  const toDeliver = card(delivery({}, { type: "DELIVERY", branch: "COLOMBO" }));
  assert.match(toDeliver, />Colombo branch</);
  assert.doesNotMatch(toDeliver, />Nugegoda, Colombo</, "a delivery card starts at the branch, not the sender's place");
  // City and district with the same name are said once.
  assert.match(toDeliver, /45 Peradeniya Road, Kandy</);
  assert.doesNotMatch(toDeliver, /Kandy, Kandy/);

  // A finished pickup keeps its pickup route (the parcel's later delivery doesn't change it).
  const handedOver = card(
    delivery(
      { status: "OUT_FOR_DELIVERY", nextStatuses: [], completed: true, completedAt: "2026-11-21T03:58:17Z", pickup: null, recipient: null },
      { type: "PICKUP", outcome: "HANDED_OVER", status: "COMPLETED", branch: "GAMPAHA", receivedBy: "S. Fernando" },
    ),
  );
  assert.match(handedOver, />Nugegoda, Colombo</);
  assert.match(handedOver, />Gampaha branch</);
  assert.doesNotMatch(withoutCopyButton(handedOver), /<button/, "no action on a finished parcel");
  assert.equal((handedOver.match(/Completed/g) ?? []).length, 1, "the completion time is shown once");
});

test("parcel detail page: each fact once (route card, no From/To in Parcel, no duplicate type/step/branch rows)", () => {
  const detail = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(detail, /title="Your route"/);
  assert.match(detail, /assignedRoute\(delivery, districtName\)/);
  assert.match(detail, /description=\{ASSIGNMENT_TYPE_LABEL\[task\.type\]\}/, "the header names the type, not a route");
  assert.doesNotMatch(detail, /placeText\(delivery\.(from|to)/, "the parcel's sender/recipient places aren't shown as a route");
  assert.doesNotMatch(detail, />Hand over at<|"Hand over at"|"Return to"/, "the branch is in the route, not repeated");
  assert.doesNotMatch(detail, /<dt className="text-grey-600">Type<\/dt>/);
  assert.doesNotMatch(detail, /<dt className="text-grey-600">Step<\/dt>/);
  assert.doesNotMatch(detail, /<dt className="text-grey-600">Completed<\/dt>/);
  assert.doesNotMatch(detail, /Delivered to<\/dt>/, "the recipient is in the proof of delivery card");
  // The three statuses stay distinct: this parcel's step (header), the parcel itself (Parcel), the task (Assignment).
  assert.match(detail, /<ParcelStatusBadge delivery=\{delivery\} \/>\s*<CopyTrackingNumber trackingNumber=\{delivery\.trackingNumber\} \/>/);
  assert.match(detail, /historical \? "Parcel status now" : "Parcel status"/);
  assert.match(detail, /Task status<\/dt>/);
  // Cash on delivery and the delivery fee once each: the next-step reminder while it applies, otherwise in Parcel.
  assert.match(detail, /delivery\.codAmount !== null && collect\?\.cod == null/);
  assert.match(detail, /fee && collect\?\.fee == null/);
  // The contact shows one full address line.
  const contact = readSource("features/courier/components/contact-details.tsx");
  assert.match(contact, /\{fullAddress\(contact, districtName\)\}/);
  assert.doesNotMatch(contact, />City<\/dt>/);
});

test("ParcelCard is compact: no instructions box or routine next-step line; a 'can't do it yet' warning stays", () => {
  const withInstructions = card(
    delivery({ status: "AT_BRANCH", nextStatuses: ["OUT_FOR_DELIVERY"], canMarkUnableToCollect: true, instructions: "Call before you arrive." }, { type: "DELIVERY", outcome: "PENDING", branch: "COLOMBO" }),
  );
  assert.doesNotMatch(withInstructions, /Call before you arrive\./);
  assert.doesNotMatch(withInstructions, /Take this parcel from Colombo branch/);
  assert.match(withInstructions, /Out for delivery<\/button>/, "the buttons still say what to do");
  assert.match(withInstructions, />Colombo branch</, "the route stays");
  // Kept on the parcel page.
  const detail = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(detail, /Instructions<\/dt>/);
  assert.match(detail, /parcelNextStep\(delivery, districtName\)/);
});

test("parcel page with ?task=: loads that history entry only (no fallback), read-only, history and status labelled", () => {
  const detail = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(detail, /const assignmentId = search\.get\("task"\);/);
  assert.match(detail, /historical \? courierApi\.historyEntry\(parcelId, assignmentId, signal\) : courierApi\.delivery\(parcelId, signal\)/);
  assert.match(detail, /notFoundTitle=\{historical \? "This history entry isn't available"/, "an entry that can't load is never replaced");
  // No actions or forms on a history entry.
  assert.match(detail, /const actionable = !historical && phase === "active";/);
  assert.match(detail, /\{actionable \? \(\s*<ParcelActionButtons/);
  assert.match(detail, /\{historical \? null : \(\s*<ParcelActionDialog/);
  assert.match(detail, /The parcel's events until this entry was finished/);
  // Today's links are unchanged: no task id.
  const card = readSource("features/courier/components/parcel-card.tsx");
  assert.match(card, /href=\{courierRoutes\.parcel\(delivery\.parcelId\)\}/);
});

test("finished entries: short outcome titles with the time (or reason), and the right tone", () => {
  type DetailModule = typeof import("../src/features/courier/components/parcel-detail-view");
  const { finishedSummary } = loadTsModule<DetailModule>("@/features/courier/components/parcel-detail-view");
  const at = "2026-11-21T05:01:01Z";
  const done = (outcome: string, extra: Record<string, unknown> = {}) =>
    finishedSummary({ completed: true, completedAt: at, task: { ...delivery().task, outcome, ...extra } as Delivery["task"] });
  const pickup = done("HANDED_OVER", { type: "PICKUP" });
  assert.equal(pickup.title, "Pickup completed");
  assert.equal(pickup.tone, "success");
  assert.match(pickup.message, /^Completed /);
  assert.equal(done("DELIVERED").title, "Delivery completed");
  assert.equal(done("RETURNED").title, "Returned to branch");
  assert.equal(done("RETURNED").tone, "error");
  const unable = done("NOT_COLLECTED", { type: "PICKUP", problem: "SENDER_UNAVAILABLE" });
  assert.equal(unable.title, "Unable to Collect");
  assert.match(unable.message, /^Reason: Sender not available · Completed /);
  const cancelled = finishedSummary({ completed: false, completedAt: null, task: { ...delivery().task, status: "CANCELLED" } });
  assert.equal(cancelled.title, "Cancelled by dispatcher");
  assert.equal(cancelled.tone, "neutral");
  // No long explanations any more.
  for (const summary of [pickup, unable, cancelled]) assert.ok(summary.message.length < 80, summary.message);
});

test("completed parcel page: no empty contact card, no route guidance, short card headers; guidance kept while active", () => {
  const detail = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(detail, /\{contact \|\| phase === "active" \? \(/, "no contact card once there is no contact to show");
  assert.doesNotMatch(detail, /Contact details are hidden once you've finished/);
  assert.match(detail, /!actionable\s*\?\s*undefined\s*:\s*task\.type === "PICKUP"/, "route guidance only for active work");
  assert.doesNotMatch(detail, /The parcel itself: its own status/);
  assert.doesNotMatch(detail, /This is your .* entry as it was/);
  assert.doesNotMatch(detail, /<dt className="text-grey-600">Unable to Collect<\/dt>/, "the reason is in the summary");
  const proof = readSource("features/courier/components/proof-of-delivery.tsx");
  assert.doesNotMatch(proof, /formatDateTime|completedAt\)/);
});

// ---- Get directions, Call, Copy tracking number ----

test("Get directions only towards the contact of an active step; never to a branch or on a finished entry", () => {
  const collect = delivery({ status: "CREATED", nextStatuses: ["PICKED_UP"], canMarkUnableToCollect: true, pickup: SENDER, recipient: null }, { type: "PICKUP", outcome: "PENDING" });
  const handOver = delivery({ status: "PICKED_UP", nextStatuses: ["AT_BRANCH"], pickup: SENDER, recipient: null }, { type: "PICKUP", outcome: "COLLECTED", status: "IN_PROGRESS" });
  const deliver = delivery({}, { type: "DELIVERY" });
  const load = delivery({ status: "AT_BRANCH", nextStatuses: ["OUT_FOR_DELIVERY"], canMarkUnableToCollect: true }, { type: "DELIVERY", outcome: "PENDING" });
  const returning = delivery({ status: "FAILED", nextStatuses: ["AT_BRANCH"] }, { type: "DELIVERY", outcome: "FAILED", status: "IN_PROGRESS" });
  const finished = delivery({ status: "DELIVERED", nextStatuses: [], completed: true, completedAt: "2026-11-05T07:00:00Z", recipient: null }, { outcome: "DELIVERED", status: "COMPLETED" });
  assert.equal(view.headingToContact(collect), true);
  assert.equal(view.headingToContact(deliver), true);
  assert.equal(view.headingToContact(load), true);
  assert.equal(view.headingToContact(handOver), false, "the branch has no street address in the API");
  assert.equal(view.headingToContact(returning), false);
  assert.equal(view.headingToContact(finished), false);

  const html = card(collect);
  const href = `https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent("14 Kandy Road, Delgoda, Gampaha, Sri Lanka")}`;
  assert.ok(html.includes(`href="${href}"`), "the sender's real address, encoded");
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /Get directions/);
  assert.doesNotMatch(card(handOver), /Get directions/);
  assert.doesNotMatch(card(returning), /Get directions/);
  assert.doesNotMatch(card(finished), /Get directions|tel:/, "no contact actions once finished");
});

test("Call keeps the number visible, uses tel: and names who is called", () => {
  const html = card(delivery({}, { type: "DELIVERY" }));
  assert.match(html, /href="tel:\+94771234567"/);
  assert.match(html, /aria-label="Call Nimal Perera on [^"]+"/);
  assert.match(html, /077 123 4567|\+94 77 123 4567/);
});

test("Copy tracking number: its own button (never a link), labelled, on cards, the parcel page and History rows", () => {
  const html = card(delivery());
  const copyButton = html.match(/<button[^>]*aria-label="Copy tracking number SD 2611 0048 17"[^>]*>/)?.[0] ?? "";
  assert.ok(copyButton, "a labelled copy button");
  assert.match(copyButton, /type="button"/, "a plain button: it never submits or navigates");
  assert.doesNotMatch(html, /<a[^>]*>[^<]*<button[^>]*Copy tracking number/, "not inside a link");
  const component = readSource("features/courier/components/copy-tracking-number.tsx");
  assert.match(component, /navigator\.clipboard\.writeText\(trackingNumber\)/);
  assert.match(component, /event\.stopPropagation\(\)/);
  assert.match(component, /title: "Tracking number copied"/);
  assert.match(component, /title: "We couldn't copy the tracking number"/, "a clipboard failure is reported");
  assert.match(readSource("features/courier/components/parcel-history.tsx"), /<CopyTrackingNumber trackingNumber=\{delivery\.trackingNumber\} \/>/);
});
