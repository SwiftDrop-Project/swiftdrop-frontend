import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * /courier/history: the parcels the courier completed (GET /courier/deliveries/history), the URL params, the rows,
 * pagination and tracking-number search, a parcel completed in two tasks, the empty states, and the parcel page's back
 * link. Fixtures follow API.md "Courier".
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
type Task = import("../src/features/courier/types").CourierTask;

const TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887001";
const OTHER_TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887002";
const PARCEL_ID = "ab598d39-d554-42f5-b609-6fa90f3a5357";
const SIBLING_ID = "4d15dee6-ad98-4ac0-91a5-fb8d08659571";

const RECIPIENT = {
  name: "Nimal Perera",
  phone: "+94771234567",
  address: "45 Peradeniya Road",
  city: "Kandy",
  district: "KANDY",
};

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


type HistoryModule = typeof import("../src/features/courier/lib/history");
type HistoryViewModule = typeof import("../src/features/courier/components/parcel-history");
type DetailViewModule = typeof import("../src/features/courier/components/parcel-detail-view");
type ApiModule = typeof import("../src/features/courier/api");
type ErrorModule = typeof import("../src/features/courier/components/courier-load-error");

const React = nodeRequire("react") as typeof import("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");
const history = loadTsModule<HistoryModule>("@/features/courier/lib/history");
const { HistoryList, HistoryLoading } = loadTsModule<HistoryViewModule>("@/features/courier/components/parcel-history");
const { parcelBackLink } = loadTsModule<DetailViewModule>("@/features/courier/components/parcel-detail-view");
const { courierApi } = loadTsModule<ApiModule>("@/features/courier/api");
const { CourierLoadError } = loadTsModule<ErrorModule>("@/features/courier/components/courier-load-error");

process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";

const params = (query: string) => history.historyParams(new URLSearchParams(query));

/** History entries never carry contacts and offer no next status (API.md: `completed: true`, no contacts). */
const done = (overrides: Partial<Delivery> = {}, task: Partial<Task> = {}): Delivery =>
  delivery(
    {
      status: "DELIVERED",
      recipient: null,
      pickup: null,
      nextStatuses: [],
      canMarkUnableToCollect: false,
      completed: true,
      completedAt: "2026-11-05T07:00:00Z",
      ...overrides,
    },
    { status: "COMPLETED", outcome: "DELIVERED", ...task },
  );

const page = (content: Delivery[], extra: Partial<{ page: number; size: number; totalElements: number; totalPages: number }> = {}) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length === 0 ? 0 : 1,
  ...extra,
});

const NO_FILTERS = { type: "", date: "", from: "", to: "" } as const;
const list = (data: ReturnType<typeof page>, trackingNumber = "", filters: Record<string, string> = {}) =>
  renderToStaticMarkup(
    React.createElement(HistoryList, {
      history: data,
      params: { page: data.page, trackingNumber, ...NO_FILTERS, ...filters } as Parameters<typeof HistoryList>[0]["params"],
      refreshing: false,
    }),
  );

// ---- URL params and links ----

test("historyParams: ?q= and a 1-based ?page=, bad values fall back", () => {
  assert.deepEqual(params(""), { page: 0, trackingNumber: "", ...NO_FILTERS });
  assert.deepEqual(params("q=%20SD2611004817%20&page=3"), { page: 2, trackingNumber: "SD2611004817", ...NO_FILTERS });
  assert.deepEqual(params("page=0"), { page: 0, trackingNumber: "", ...NO_FILTERS });
  assert.deepEqual(params("page=abc"), { page: 0, trackingNumber: "", ...NO_FILTERS });
});

test("historyHref leaves defaults out; parcels opened from history link back to it", () => {
  assert.equal(history.historyHref(), "/courier/history");
  assert.equal(history.historyHref({ page: 1 }), "/courier/history?page=2");
  assert.equal(history.historyHref({ trackingNumber: " SD2611004817 " }), "/courier/history?q=SD2611004817");
  // A history entry opens that entry's own task, and links back to the history.
  assert.equal(
    history.parcelHrefFromHistory(PARCEL_ID, TASK_ID),
    `/courier/parcels/${PARCEL_ID}?from=history&task=${TASK_ID}`,
  );
  assert.deepEqual(parcelBackLink("history"), { backHref: "/courier/history", backLabel: "Back to parcel history" });
  assert.deepEqual(parcelBackLink(null), { backHref: "/courier", backLabel: "Back to today's parcels" });
});

test("the history call sends page, size and the tracking number to /courier/deliveries/history", async () => {
  const calls: URL[] = [];
  globalThis.fetch = (async (input: string | URL) => {
    calls.push(new URL(String(input)));
    return new Response(JSON.stringify(page([done()], { page: 2, totalElements: 41, totalPages: 3 })), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  const result = await courierApi.history({ page: 2, size: history.HISTORY_PAGE_SIZE, trackingNumber: "sd 2611 0048 17" });
  assert.equal(calls[0].pathname, "/api/v1/courier/deliveries/history");
  assert.equal(calls[0].searchParams.get("page"), "2");
  assert.equal(calls[0].searchParams.get("size"), "20");
  assert.equal(calls[0].searchParams.get("trackingNumber"), "sd 2611 0048 17", "the backend ignores spaces and case");
  assert.equal(result.totalPages, 3);
});

// ---- Rows ----

test("rows: tracking number, courier status, route, completion time, how it ended, and Open to the parcel page", () => {
  const handedOver = done(
    { stop: "PICKUP", status: "AT_BRANCH", parcelId: SIBLING_ID, trackingNumber: "SD2611004818" },
    { type: "PICKUP", outcome: "HANDED_OVER", status: "IN_PROGRESS", receivedBy: "S. Silva" },
  );
  const notCollected = done(
    { stop: "PICKUP", status: "CREATED", parcelId: "33333333-3333-4333-8333-333333333333", trackingNumber: "SD2611004819" },
    { type: "PICKUP", outcome: "NOT_COLLECTED", problem: "SENDER_UNAVAILABLE" },
  );
  const html = list(page([done(), handedOver, notCollected]));
  assert.match(html, /SD 2611 0048 17/);
  assert.match(html, /Delivered/);
  // Each entry's own leg: a delivery starts at its task's branch, a pickup ends at its task's branch.
  assert.match(html, /Delivery · Colombo branch → Kandy/);
  assert.match(html, /Pickup · Nugegoda, Colombo → Colombo branch/);
  assert.doesNotMatch(html, /Nugegoda, Colombo → Kandy/, "never the parcel's whole journey");
  assert.match(html, /Completed /);
  assert.match(html, /Handed over/);
  assert.match(html, /Received at the branch by S\. Silva/);
  assert.match(html, /Not collected/);
  assert.match(html, /Reason: Sender not available/);
  assert.match(html, new RegExp(`href="/courier/parcels/${PARCEL_ID}\\?from=history&amp;task=${TASK_ID}"`));
  // A parcel completed while the rest of its task was still in progress is listed all the same.
  assert.match(html, /aria-label="Open parcel SD 2611 0048 18"/);
});

test("rows never show contacts", () => {
  const html = list(page([done()]));
  assert.doesNotMatch(html, /Nimal Perera|tel:|\+94/, "no names or phone numbers in history");
});

test("a parcel completed in two tasks has two rows (failed and returned, then delivered)", () => {
  const returned = done({ status: "DELIVERED", completedAt: "2026-11-03T09:00:00Z" }, { assignmentId: TASK_ID, outcome: "RETURNED", receivedBy: "M. Perera" });
  const delivered = done({ completedAt: "2026-11-05T07:00:00Z" }, { assignmentId: OTHER_TASK_ID, outcome: "DELIVERED" });
  const html = list(page([delivered, returned]), "SD2611004817");
  assert.equal(html.match(/aria-label="Open parcel SD 2611 0048 17"/g)?.length, 2, "one row per completed task");
  assert.match(html, /Returned to branch/);
  assert.match(html, /Delivered/);
  assert.match(html, /aria-label="Finished parcels for SD2611004817"/);
});

test("pagination uses the backend's page numbers and keeps the search", () => {
  const html = list(page([done()], { page: 1, totalElements: 41, totalPages: 3 }), "SD2611");
  assert.match(html, /href="\/courier\/history\?q=SD2611&amp;page=3"/);
  assert.match(html, /href="\/courier\/history\?q=SD2611"/, "page 1 leaves the page out");
});

test("a branch transfer on the page is counted in a notice, never listed as a delivery", () => {
  const transfer = done(
    { parcelId: "66666666-6666-4666-8666-666666666666", trackingNumber: "SD2611004820", status: "AT_BRANCH" },
    { type: "TRANSFER", outcome: "HANDED_OVER" },
  );
  const html = list(page([done(), transfer], { totalElements: 2 }));
  assert.match(html, /1 branch transfer on this page not shown/);
  assert.doesNotMatch(html, /SD 2611 0048 20/, "the transfer has no row");
  assert.match(html, /SD 2611 0048 17/, "the delivery is listed");
  assert.equal(html.match(/aria-label="Open parcel /g)?.length, 1);
});

// ---- Empty states ----

test("empty states: no parcels yet, no search results, a page past the end", () => {
  assert.match(list(page([])), /No finished parcels yet/);
  const search = list(page([]), "SD2611009999");
  assert.match(search, /No finished parcels with this tracking number/);
  assert.match(search, /Clear search/);
  const past = list(page([], { page: 5, totalElements: 21, totalPages: 2 }));
  assert.match(past, /This page is empty/);
  assert.match(past, /href="\/courier\/history"/);
});

test("loading and error states", () => {
  assert.match(renderToStaticMarkup(React.createElement(HistoryLoading)), /aria-label="Loading your parcel history"/);
  const error = renderToStaticMarkup(
    React.createElement(CourierLoadError, {
      error: { kind: "other", message: "Try again.", fieldErrors: {}, reload: false },
      title: "We couldn't load your parcel history",
      onRetry: () => undefined,
    }),
  );
  assert.match(error, /We couldn&#x27;t load your parcel history/);
  assert.match(error, /Try again/);
});

test("the history page renders CourierParcelHistory and the top bar search lands on it", () => {
  assert.match(readSource("app/courier/history/page.tsx"), /<CourierParcelHistory\s*\/>/);
  const navigation = readSource("lib/navigation.ts");
  assert.match(navigation, /COURIER: \{ placeholder: "Search by tracking number", href: "\/courier\/history" \}/);
  const viewSource = readSource("features/courier/components/parcel-history.tsx");
  assert.match(viewSource, /page: params\.page,\s*size: HISTORY_PAGE_SIZE,/);
  assert.match(viewSource, /\.\.\.historyFilterQuery\(params\)/, "the filters go to the backend, never to the loaded page");
  assert.match(viewSource, /key=\{deliveryKey\(delivery\)\}/, "rows keyed per parcel and task");
});

test("history rows show a proof badge for deliveries with a signed-slip photo", () => {
  const withProof = done({ proof: { recipientName: "Nimal Perera", hasPhoto: true } });
  const pickup = done(
    { stop: "PICKUP", status: "AT_BRANCH", parcelId: SIBLING_ID, trackingNumber: "SD2611004818", proof: null },
    { type: "PICKUP", outcome: "HANDED_OVER", receivedBy: "S. Silva" },
  );
  const html = list(page([withProof, pickup]));
  assert.equal(html.match(/Proof attached/g)?.length, 1, "only the delivery has one");
});

test("the history entry call goes to /courier/deliveries/{parcelId}/history/{assignmentId} and never to the parcel's latest step", async () => {
  const calls: URL[] = [];
  globalThis.fetch = (async (input: string | URL) => {
    calls.push(new URL(String(input)));
    return new Response(JSON.stringify({ ...done(), history: [], failureReason: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  await courierApi.historyEntry(PARCEL_ID, TASK_ID);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, `/api/v1/courier/deliveries/${PARCEL_ID}/history/${TASK_ID}`);
});

test("a pickup row never shows 'Proof attached', even if proof were sent; the delivery row does", () => {
  const pickupWithProof = done(
    { stop: "PICKUP", status: "DELIVERED", parcelId: SIBLING_ID, trackingNumber: "SD2611004818", proof: { recipientName: "Kamala Silva", hasPhoto: true } },
    { type: "PICKUP", outcome: "HANDED_OVER", receivedBy: "S. Silva" },
  );
  const pickupHtml = list(page([pickupWithProof]));
  assert.doesNotMatch(pickupHtml, /Proof attached/);
  const deliveredHtml = list(page([done({ proof: { recipientName: "Kamala Silva", hasPhoto: true } }, { outcome: "DELIVERED" })]));
  assert.match(deliveredHtml, /Proof attached/);
});

// ---- Filters (parcel type, completion date) ----

test("historyParams reads type and date; bad values fall back to all; an old ?outcome= is ignored", () => {
  assert.deepEqual(params("type=PICKUP&date=7d"), { page: 0, trackingNumber: "", type: "PICKUP", date: "7d", from: "", to: "" });
  assert.deepEqual(params("type=TRANSFER&date=yesterday"), { page: 0, trackingNumber: "", ...NO_FILTERS });
  // No outcome filter on this screen: an old link never filters silently.
  assert.deepEqual(params("outcome=RETURNED"), { page: 0, trackingNumber: "", ...NO_FILTERS });
  assert.equal("outcome" in params("outcome=RETURNED"), false);
  assert.deepEqual(params("date=custom&from=2026-11-01&to=2026-11-21"), {
    page: 0, trackingNumber: "", ...NO_FILTERS, date: "custom", from: "2026-11-01", to: "2026-11-21",
  });
  assert.equal(params("date=7d&from=2026-11-01").from, "", "a range only goes with a custom date");
  assert.equal(params("date=custom&from=21-11-2026").from, "", "not a day");
});

test("historyHref keeps search and filters, leaves defaults out, never writes an outcome", () => {
  assert.equal(
    history.historyHref({ trackingNumber: "SD2611", type: "DELIVERY", date: "30d", page: 1 }),
    "/courier/history?q=SD2611&type=DELIVERY&date=30d&page=2",
  );
  assert.equal(
    history.historyHref({ date: "custom", from: "2026-11-01", to: "2026-11-21" }),
    "/courier/history?date=custom&from=2026-11-01&to=2026-11-21",
  );
  assert.equal(history.historyHref({ date: "today", from: "2026-11-01" }), "/courier/history?date=today");
  // A link built from an old URL with ?outcome= drops it.
  assert.equal(history.historyHref(params("outcome=RETURNED&type=PICKUP")), "/courier/history?type=PICKUP");
});

test("date presets are Sri Lankan days ending today; a custom range is sent as chosen; no outcome is ever sent", () => {
  // 00:30 on 21 Nov in Colombo is still 20 Nov in UTC.
  const now = new Date("2026-11-20T19:00:00Z");
  assert.equal(history.colomboToday(now), "2026-11-21");
  const query = (date: string, extra = {}) => history.historyFilterQuery({ ...NO_FILTERS, date: date as never, ...extra }, now);
  assert.deepEqual(query("today"), { type: undefined, completedFrom: "2026-11-21", completedTo: "2026-11-21" });
  assert.deepEqual(query("7d"), { type: undefined, completedFrom: "2026-11-15", completedTo: "2026-11-21" });
  assert.equal(query("30d").completedFrom, "2026-10-23");
  assert.deepEqual(query("custom", { from: "2026-11-01", to: "" }), { type: undefined, completedFrom: "2026-11-01", completedTo: undefined });
  const fromOldUrl = history.historyFilterQuery(params("outcome=RETURNED&type=PICKUP"), now);
  assert.deepEqual(fromOldUrl, { type: "PICKUP" });
  assert.equal("outcome" in fromOldUrl, false);
});

test("the history call sends the filters to the backend (never filters the loaded page)", async () => {
  const calls: URL[] = [];
  globalThis.fetch = (async (input: string | URL) => {
    calls.push(new URL(String(input)));
    return new Response(JSON.stringify(page([])), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  await courierApi.history({ page: 0, size: 20, type: "DELIVERY", completedFrom: "2026-11-15", completedTo: "2026-11-21" });
  const sent = calls[0].searchParams;
  assert.equal(sent.get("type"), "DELIVERY");
  assert.equal(sent.get("completedFrom"), "2026-11-15");
  assert.equal(sent.get("completedTo"), "2026-11-21");
  assert.equal(sent.has("outcome"), false);
  await courierApi.history({ page: 0, size: 20 });
  assert.equal(calls[1].searchParams.has("type"), false, "unset filters aren't sent");
});

test("no entries match the filters: says so and offers Clear filters", () => {
  const html = list(page([]), "SD2611", { type: "PICKUP" });
  assert.match(html, /No finished parcels match/);
  assert.match(html, /Clear filters/);
  assert.match(html, /href="\/courier\/history"/);
});

test("the page layout: compact search on phones only, two filters in one row, then the count and Clear filters", () => {
  const source = readSource("features/courier/components/parcel-history.tsx");
  assert.match(source, /<HistorySearch key=\{params\.trackingNumber\} params=\{params\} className="md:hidden" \/>\s*<HistoryFilters params=\{params\} \/>/);
  assert.match(source, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.match(source, /label="Parcel type"[\s\S]*label="Completion date"/);
  assert.doesNotMatch(source, /label="Outcome"|HISTORY_OUTCOMES/, "no outcome filter on this screen");
  assert.match(source, /completed \{total === 1 \? "entry" : "entries"\}/);
  assert.match(source, / for \$\{formatTrackingNumber\(params\.trackingNumber\)\}/, "an active (header) search is named");
  assert.match(source, /historyHref\(\{ \.\.\.params, \.\.\.next, page: 0 \}\)/, "a filter change goes back to page 1");
});
