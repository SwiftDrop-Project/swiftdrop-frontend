import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * /courier/history (GET /courier/assignments/history): URL params (?q= tracking number, ?page=), the request
 * they make (fetch is replaced), the list and its states rendered to HTML, links to the task page, and the back link.
 * Fixtures follow API.md "Courier".
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

type HistoryModule = typeof import("../src/features/courier/lib/history");
type ApiModule = typeof import("../src/features/courier/api");
type HistoryViewModule = typeof import("../src/features/courier/components/task-history");
type TaskViewModule = typeof import("../src/features/courier/components/task-detail-view");
type LoadErrorModule = typeof import("../src/features/courier/components/courier-load-error");
type Summary = import("../src/features/courier/types").CourierTaskSummary;
type Page = import("../src/features/courier/types").CourierTaskPage;

const history = loadTsModule<HistoryModule>("@/features/courier/lib/history");
const { courierApi } = loadTsModule<ApiModule>("@/features/courier/api");
const { HistoryList, HistoryLoading } = loadTsModule<HistoryViewModule>("@/features/courier/components/task-history");
const { taskBackLink } = loadTsModule<TaskViewModule>("@/features/courier/components/task-detail-view");
const { CourierLoadError } = loadTsModule<LoadErrorModule>("@/features/courier/components/courier-load-error");
const React = nodeRequire("react") as typeof import("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");

const A1 = "c6dd7fdd-ecf6-48b7-8eb5-253117887001";
const A2 = "5f3e2d1c-0b9a-4c8d-8e7f-6a5b4c3d2e1f";

const summary = (overrides: Partial<Summary> = {}): Summary => ({
  assignmentId: A1,
  type: "PICKUP",
  status: "COMPLETED",
  originBranch: null,
  destinationBranch: "GAMPAHA",
  scheduledFor: "2026-11-09",
  note: null,
  assignedAt: "2026-11-09T02:30:00Z",
  completedAt: "2026-11-09T08:00:00Z",
  counts: { total: 3, open: 0, closed: 3, problems: 1 },
  canComplete: false,
  ...overrides,
});

const page = (content: Summary[], overrides: Partial<Page> = {}): Page => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length === 0 ? 0 : 1,
  ...overrides,
});

const render = (element: React.ReactElement) => renderToStaticMarkup(element);
const hrefs = (markup: string) => [...markup.matchAll(/href="([^"]*)"/g)].map((match) => match[1].replace(/&amp;/g, "&"));
const search = (query: string) => new URLSearchParams(query);

// ---- URL ----

test("?q= is the tracking number (the top bar's search lands here) and ?page= is 1-based; bad values fall back", () => {
  assert.deepEqual(history.historyParams(search("")), { page: 0, trackingNumber: "" });
  assert.deepEqual(history.historyParams(search("q=%20sd%202611%200600%2001%20&page=3")), { page: 2, trackingNumber: "sd 2611 0600 01" });
  assert.deepEqual(history.historyParams(search("page=0")), { page: 0, trackingNumber: "" });
  assert.deepEqual(history.historyParams(search("page=-4")), { page: 0, trackingNumber: "" });
  assert.deepEqual(history.historyParams(search("page=abc")), { page: 0, trackingNumber: "" });
});

test("history links leave out the defaults, and a task opened from the history says so", () => {
  assert.equal(history.historyHref(), "/courier/history");
  assert.equal(history.historyHref({ page: 0, trackingNumber: "  " }), "/courier/history");
  assert.equal(history.historyHref({ trackingNumber: "SD 2611 0600 01" }), "/courier/history?q=SD+2611+0600+01");
  assert.equal(history.historyHref({ page: 2, trackingNumber: "SD2611060001" }), "/courier/history?q=SD2611060001&page=3");
  assert.equal(history.taskHrefFromHistory(A1), `/courier/tasks/${A1}?from=history`);
  assert.deepEqual(taskBackLink("history"), { backHref: "/courier/history", backLabel: "Back to task history" });
  assert.deepEqual(taskBackLink(null), { backHref: "/courier", backLabel: "Back to today's tasks" });
});

// ---- The request ----

process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";

test("the URL's page and tracking number go to the backend's page, size and trackingNumber", async () => {
  const urls: URL[] = [];
  globalThis.fetch = (async (input: string | URL) => {
    urls.push(new URL(String(input)));
    return new Response(JSON.stringify(page([summary()], { page: 2, totalElements: 41, totalPages: 3 })), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const params = history.historyParams(search("q=SD2611060001&page=3"));
  await courierApi.history({ page: params.page, size: history.HISTORY_PAGE_SIZE, trackingNumber: params.trackingNumber || undefined });
  assert.equal(urls[0].pathname, "/api/v1/courier/assignments/history");
  assert.equal(urls[0].searchParams.get("page"), "2");
  assert.equal(urls[0].searchParams.get("size"), "20");
  assert.equal(urls[0].searchParams.get("trackingNumber"), "SD2611060001");

  const plain = history.historyParams(search(""));
  await courierApi.history({ page: plain.page, size: history.HISTORY_PAGE_SIZE, trackingNumber: plain.trackingNumber || undefined });
  assert.equal(urls[1].searchParams.get("page"), "0");
  assert.equal(urls[1].searchParams.has("trackingNumber"), false, "no search: no trackingNumber");
});

// ---- The list ----

test("each task shows type, status, route, day, progress and completion, and opens its task page from the history", () => {
  const markup = render(
    React.createElement(HistoryList, {
      history: page([
        summary(),
        summary({
          assignmentId: A2,
          type: "TRANSFER",
          status: "CANCELLED",
          originBranch: "GAMPAHA",
          destinationBranch: "MATARA",
          scheduledFor: "2026-11-12",
          completedAt: null,
          counts: { total: 1, open: 0, closed: 1, problems: 0 },
        }),
      ]),
      trackingNumber: "",
      refreshing: false,
    }),
  );
  assert.match(markup, /Pickup task/);
  assert.match(markup, /Completed/);
  assert.match(markup, /Collect from senders, hand over at Gampaha branch/);
  assert.match(markup, /9 Nov 2026 · 3 of 3 parcels done · 1 problem · Completed 9 Nov 2026, 1:30 PM/);
  assert.match(markup, /Transfer task/);
  assert.match(markup, /Cancelled/);
  assert.match(markup, /Gampaha branch to Matara branch/);
  assert.doesNotMatch(markup, /Planned for/, "the history never marks later days");
  const links = hrefs(markup);
  assert.ok(links.includes(`/courier/tasks/${A1}?from=history`));
  assert.ok(links.includes(`/courier/tasks/${A2}?from=history`));

  // Accessible names tell the rows apart.
  const labels = [...markup.matchAll(/aria-label="(Open [^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, [
    "Open pickup task: Collect from senders, hand over at Gampaha branch, 9 Nov 2026",
    "Open transfer task: Gampaha branch to Matara branch, 12 Nov 2026",
  ]);
});

test("pagination uses the backend's page numbers and keeps the search in its links", () => {
  const markup = render(
    React.createElement(HistoryList, {
      history: page([summary(), summary({ assignmentId: A2 })], { page: 1, size: 20, totalElements: 42, totalPages: 3 }),
      trackingNumber: "SD2611060001",
      refreshing: false,
    }),
  );
  assert.match(markup, /Showing 21–40 of 42 tasks/);
  assert.match(markup, /aria-current="page"/);
  const links = hrefs(markup);
  assert.ok(links.includes("/courier/history?q=SD2611060001"), "previous / first page");
  assert.ok(links.includes("/courier/history?q=SD2611060001&page=3"), "next / last page");
});

test("empty states: no tasks yet, no tasks for this tracking number, a page past the end", () => {
  const none = render(React.createElement(HistoryList, { history: page([]), trackingNumber: "", refreshing: false }));
  assert.match(none, /No finished tasks yet/);
  assert.ok(hrefs(none).includes("/courier"));

  const noMatch = render(React.createElement(HistoryList, { history: page([]), trackingNumber: "SD2611069999", refreshing: false }));
  assert.match(noMatch, /No tasks found for this tracking number/);
  assert.match(noMatch, /held SD2611069999/);
  assert.ok(hrefs(noMatch).includes("/courier/history"), "Clear search");

  const pastEnd = render(
    React.createElement(HistoryList, { history: page([], { page: 7, totalElements: 42, totalPages: 3 }), trackingNumber: "", refreshing: false }),
  );
  assert.match(pastEnd, /This page is empty/);
  assert.ok(hrefs(pastEnd).includes("/courier/history"), "Go to the first page");
});

test("loading and error states: a busy skeleton, and an error with Try again", () => {
  const loading = render(React.createElement(HistoryLoading));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /aria-label="Loading your task history"/);

  const error = render(
    React.createElement(CourierLoadError, {
      error: { kind: "other", message: "We couldn't reach SwiftDrop. Check your connection and try again.", fieldErrors: {}, reload: false },
      title: "We couldn't load your task history",
      onRetry: () => undefined,
    }),
  );
  assert.match(error, /We couldn&#x27;t load your task history/);
  assert.match(error, /Check your connection/);
  assert.match(error, /<button[^>]*>Try again<\/button>/);
});

// ---- Page and component conventions ----

test("the history page is guarded, the search form is labelled, and tasks keep a way back to the history", () => {
  const pageSource = fs.readFileSync(path.join(SRC_ROOT, "app/courier/history/page.tsx"), "utf8");
  assert.match(pageSource, /<RequireCurrentUser/);
  assert.match(pageSource, /<CourierTaskHistory\s*\/>/);
  assert.doesNotMatch(pageSource, /ComingSoon|export\s+const\s+instant|async\s+function/);

  const view = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/task-history.tsx"), "utf8");
  assert.match(view, /role="search"/);
  assert.match(view, /<label htmlFor="history-tracking-number"/);
  assert.match(view, /id="history-tracking-number"/);
  assert.match(view, /courierApi\.history\(\{ page, size: HISTORY_PAGE_SIZE, trackingNumber: trackingNumber \|\| undefined \}/,
    "only the backend's own parameters; no filtering or sorting in the browser");

  const task = fs.readFileSync(path.join(SRC_ROOT, "features/courier/components/task-detail-view.tsx"), "utf8");
  assert.match(task, /taskBackLink\(useSearchParams\(\)\.get\("from"\)\)/);
});
