import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * Courier preview mode (development only, NEXT_PUBLIC_COURIER_PREVIEW=true): off by default and in production, never
 * calls fetch, answers /courier/deliveries/* in the shape the schemas check, and follows the backend's parcel rules
 * (one parcel at a time, completion per parcel, the task completing by itself, Unable to Collect, privacy, 409s).
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

type FlagModule = typeof import("../src/features/courier/preview/flag");
type PreviewModule = typeof import("../src/features/courier/preview/preview-api");
type SchemasModule = typeof import("../src/features/courier/schemas");
type ClientModule = typeof import("../src/lib/api/client");
type Today = import("../src/features/courier/types").CourierToday;
type Page = import("../src/features/courier/types").CourierDeliveryPage;

const flag = loadTsModule<FlagModule>("@/features/courier/preview/flag");
const preview = loadTsModule<PreviewModule>("@/features/courier/preview/preview-api");
const schemas = loadTsModule<SchemasModule>("@/features/courier/schemas");
const { ApiError } = loadTsModule<ClientModule>("@/lib/api/client");

/** Sample parcel ids (preview/data.ts): 7e570000-0000-4000-8000-0000000000NN. */
const P = (n: number) => `7e570000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const NOW = new Date("2026-11-05T06:30:00Z"); // 12:00 in Colombo

function reset() {
  preview.resetCourierPreview(NOW, { delayMs: 0 });
  globalThis.fetch = (async () => {
    throw new Error("preview mode must never call fetch");
  }) as typeof fetch;
}

const get = <T,>(path: string, query?: Record<string, string | number | undefined>) =>
  preview.courierPreviewFetch<T>(path, { query });
const post = <T,>(path: string, body: unknown) => preview.courierPreviewFetch<T>(path, { method: "POST", body });
const today = async () => schemas.courierTodaySchema.parse(await get<Today>("/courier/deliveries/today"));
const parcel = async (n: number) => schemas.courierDeliveryDetailSchema.parse(await get(`/courier/deliveries/${P(n)}`));
const status = async (n: number, body: unknown) =>
  schemas.courierDeliveryDetailSchema.parse(await post(`/courier/deliveries/${P(n)}/status`, body));
const unable = async (n: number, body: unknown) =>
  schemas.courierDeliveryDetailSchema.parse(await post(`/courier/deliveries/${P(n)}/unable-to-collect`, body));

/** A small JPEG-looking photo of the signed slip, as the browser would send it. */
const slip = (name = "slip.jpg", type = "image/jpeg", size = 3) =>
  new File([new Uint8Array(size).fill(0xff)], name, { type });
const upload = async (n: number, file: Blob = slip()) => {
  const body = new FormData();
  body.append("file", file);
  return schemas.proofUploadSchema.parse(await post(`/courier/deliveries/${P(n)}/proof`, body));
};

async function rejectsWith(promise: Promise<unknown>, code: string, field?: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ApiError, "an ApiError, like apiFetch throws");
    assert.equal(error.code, code);
    if (field) assert.ok(field in (error.fieldErrors ?? {}), `field error on ${field}`);
    return true;
  });
}

// ---- The flag ----

test("proof in preview never reaches the backend or Cloudinary: upload and image both go through the preview switch", () => {
  const api = readSource("features/courier/api.ts");
  // The upload is sent with `request` (courierPreviewFetch when preview is on), never apiFetch directly.
  assert.match(api, /async uploadProof[\s\S]*?await request<unknown>\(endpoint, \{ method: "POST", body \}\)/);
  assert.match(api, /proofImageUrl\(parcelId: string\): string \| null \{\s*return COURIER_PREVIEW \? previewProofImageUrl\(parcelId\) : apiUrl/);
  const previewApi = readSource("features/courier/preview/preview-api.ts");
  assert.doesNotMatch(previewApi, /\bfetch\(|apiFetch\(|apiUrl\(/, "preview answers from memory only");
  // No Cloudinary anywhere in the frontend: storage is the backend's business.
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  for (const file of walk(SRC_ROOT).filter((name) => /\.(ts|tsx)$/.test(name))) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /cloudinary/i, `${file} mentions Cloudinary`);
  }
});

test("preview is off by default, needs exactly \"true\", and never runs in production", () => {
  assert.equal(flag.isCourierPreviewEnabled(undefined, "development"), false);
  assert.equal(flag.isCourierPreviewEnabled("1", "development"), false);
  assert.equal(flag.isCourierPreviewEnabled("true", "development"), true);
  assert.equal(flag.isCourierPreviewEnabled("true", "production"), false);
  assert.equal(flag.COURIER_PREVIEW, false, "off in the test run (no NEXT_PUBLIC_COURIER_PREVIEW)");
  const api = readSource("features/courier/api.ts");
  assert.match(api, /const request: typeof apiFetch = COURIER_PREVIEW \? courierPreviewFetch : apiFetch;/);
  const previewSource = readSource("features/courier/preview/preview-api.ts");
  assert.doesNotMatch(previewSource, /\bfetch\(/, "the preview never calls fetch");
});

// ---- Today ----

test("today: one entry per parcel, active and completed, in the backend's order; cancelled work left out", async () => {
  reset();
  const data = await today();
  assert.equal(data.date, "2026-11-05");
  const ids = data.items.map((item) => item.parcelId);
  assert.equal(new Set(ids).size, ids.length, "each parcel once");
  assert.ok(!ids.includes(P(14)), "the cancelled pickup isn't shown");
  assert.ok(!ids.includes(P(15)), "parcels completed on earlier days aren't shown");
  const active = data.items.filter((item) => !item.completed);
  const completed = data.items.filter((item) => item.completed);
  assert.equal(data.toDo, active.length);
  assert.equal(data.done, completed.length);
  // Order: open pickups, then the other active parcels, then completed ones (newest first).
  const firstDelivery = data.items.findIndex((item) => !item.completed && item.stop === "DELIVERY");
  const lastPickup = data.items.map((item) => !item.completed && item.stop === "PICKUP").lastIndexOf(true);
  assert.ok(lastPickup < firstDelivery);
  assert.ok(data.items.findIndex((item) => item.completed) > data.items.map((item) => !item.completed).lastIndexOf(true));
});

test("siblings in one task: one handed over (completed) while the others stay active", async () => {
  reset();
  const data = await today();
  const task = data.items.find((item) => item.parcelId === P(3))!.task.assignmentId;
  const siblings = data.items.filter((item) => item.task.assignmentId === task);
  assert.equal(siblings.length, 3, "the three parcels of the same task are three cards");
  assert.deepEqual(siblings.map((item) => item.completed).sort(), [false, false, true]);
  assert.equal(siblings[0].task.status, "IN_PROGRESS");
});

test("pickups and deliveries only: no transfer today or in history", async () => {
  reset();
  const data = await today();
  assert.ok(data.items.length > 0);
  assert.ok(data.items.every((item) => item.task.type === "PICKUP" || item.task.type === "DELIVERY"));
  assert.ok(data.items.every((item) => !item.nextStatuses.includes("IN_TRANSIT")), "no transfer step offered");
  const all = await get<Page>("/courier/deliveries/history", { page: 0, size: 100 });
  assert.ok(all.content.every((item) => item.task.type === "PICKUP" || item.task.type === "DELIVERY"));
  assert.equal(readSource("features/courier/preview/data.ts").match(/"TRANSFER"/g), null, "no transfer in the sample");
});

test("privacy: contacts only in an open step; none once completed", async () => {
  reset();
  const data = await today();
  const byId = new Map(data.items.map((item) => [item.parcelId, item]));
  assert.ok(byId.get(P(1))!.pickup, "an open pickup has the sender");
  assert.equal(byId.get(P(1))!.recipient, null);
  assert.ok(byId.get(P(6))!.recipient, "an open delivery has the recipient");
  assert.equal(byId.get(P(6))!.pickup, null);
  assert.equal(byId.get(P(3))!.pickup, null, "completed: no contact");
  assert.equal(byId.get(P(9))!.recipient, null, "completed delivery: no contact");
  assert.ok(byId.get(P(3))!.from && byId.get(P(3))!.to, "from/to are always there");
  const detail = await parcel(9);
  assert.ok(!JSON.stringify(detail.history).includes("note"), "history has no notes");
});

test("a parcel not at the task's origin branch can't be taken out, only marked Unable to Collect", async () => {
  reset();
  const waiting = (await today()).items.find((item) => item.parcelId === P(10))!;
  assert.deepEqual(waiting.nextStatuses, []);
  assert.equal(waiting.canMarkUnableToCollect, true);
  // The step allows it, but the parcel isn't at the task's origin branch: the backend's INVALID_STATUS_TRANSITION.
  await rejectsWith(status(10, { status: "OUT_FOR_DELIVERY" }), "INVALID_STATUS_TRANSITION");
});

// ---- Workflows ----

test("pickup: PICKED_UP keeps it active; AT_BRANCH needs receivedBy and completes it; the task completes after its last parcel", async () => {
  reset();
  let after = await status(1, { status: "PICKED_UP", feeCollected: true });
  assert.equal(after.completed, false, "picked up is not completed");
  assert.deepEqual(after.nextStatuses, ["AT_BRANCH"]);

  await rejectsWith(status(1, { status: "AT_BRANCH" }), "VALIDATION_FAILED", "receivedBy");
  await rejectsWith(status(1, { status: "AT_BRANCH", receivedBy: " A " }), "VALIDATION_FAILED", "receivedBy");
  after = await status(1, { status: "AT_BRANCH", receivedBy: "  S. Silva " });
  assert.equal(after.completed, true);
  assert.equal(after.task.receivedBy, "S. Silva", "trimmed");
  assert.equal(after.task.outcome, "HANDED_OVER");
  assert.equal(after.task.status, "IN_PROGRESS", "a sibling (picked up) is still active");
  assert.equal(after.pickup, null, "no contact once completed");

  after = await status(2, { status: "AT_BRANCH", receivedBy: "S. Silva" });
  assert.equal(after.task.status, "COMPLETED", "the backend rule: the last parcel completes the task");
  await rejectsWith(status(2, { status: "AT_BRANCH", receivedBy: "S. Silva" }), "ASSIGNMENT_CLOSED");
});

test("delivery: out for delivery, delivered with recipientName; FAILED stays active until the AT_BRANCH return", async () => {
  reset();
  let after = await status(6, { status: "OUT_FOR_DELIVERY" });
  assert.equal(after.completed, false);
  assert.deepEqual(after.nextStatuses, ["DELIVERED", "FAILED"]);
  await rejectsWith(status(6, { status: "DELIVERED" }), "VALIDATION_FAILED", "recipientName");
  await rejectsWith(status(6, { status: "DELIVERED", recipientName: "Ayesha" }), "VALIDATION_FAILED", "proofPhotoId");
  const photo = await upload(6);
  after = await status(6, { status: "DELIVERED", recipientName: "Ayesha", proofPhotoId: photo.proofPhotoId, feeCollected: true });
  assert.equal(after.completed, true);
  assert.deepEqual(after.proof, { recipientName: "Ayesha", hasPhoto: true });
  assert.ok(preview.previewProofImageUrl(P(6)), "the picked photo is shown from memory");

  await rejectsWith(status(7, { status: "FAILED" }), "VALIDATION_FAILED", "failureReason");
  await rejectsWith(status(7, { status: "FAILED", failureReason: "OTHER", note: "no" }), "VALIDATION_FAILED", "note");
  after = await status(7, { status: "FAILED", failureReason: "WRONG_ADDRESS" });
  assert.equal(after.completed, false, "FAILED alone is not completed");
  assert.deepEqual(after.nextStatuses, ["AT_BRANCH"]);
  assert.equal(after.failureReason, "WRONG_ADDRESS");
  after = await status(7, { status: "AT_BRANCH", receivedBy: "M. Perera" });
  assert.equal(after.completed, true);
  assert.equal(after.task.outcome, "RETURNED");
  assert.equal(after.status, "AT_BRANCH");
});

test("Unable to Collect: one action for pickups and deliveries; the backend picks the outcome; the status stays", async () => {
  reset();
  await rejectsWith(unable(4, { problem: "OTHER" }), "VALIDATION_FAILED", "note");
  await rejectsWith(unable(4, {}), "VALIDATION_FAILED", "problem");
  let after = await unable(4, { problem: "SENDER_UNAVAILABLE" });
  assert.equal(after.task.outcome, "NOT_COLLECTED");
  assert.equal(after.task.problem, "SENDER_UNAVAILABLE");
  assert.equal(after.status, "CREATED", "the parcel never moved");
  assert.equal(after.completed, true);

  after = await unable(10, { problem: "OTHER", note: "Not at the branch yet" });
  assert.equal(after.task.outcome, "NOT_LOADED");
  assert.equal(after.task.status, "COMPLETED", "its only parcel: the task completes");

  await rejectsWith(unable(2, { problem: "PARCEL_MISSING" }), "TASK_STEP_NOT_ALLOWED");
});

test("the button pressed twice, a skipped step, a cancelled task: the backend's 409s", async () => {
  reset();
  await status(1, { status: "PICKED_UP", feeCollected: true });
  await rejectsWith(status(1, { status: "PICKED_UP" }), "TASK_STEP_NOT_ALLOWED");
  await rejectsWith(status(4, { status: "AT_BRANCH", receivedBy: "S. Silva" }), "TASK_STEP_NOT_ALLOWED");
  await rejectsWith(status(14, { status: "PICKED_UP" }), "ASSIGNMENT_CLOSED");
  await rejectsWith(get("/courier/deliveries/7e570000-0000-4000-8000-999999999999"), "NOT_FOUND");
});

test("a cancelled parcel's page: not completed, nothing to do, no contact", async () => {
  reset();
  const cancelled = await parcel(14);
  assert.equal(cancelled.task.status, "CANCELLED");
  assert.equal(cancelled.completed, false);
  assert.equal(cancelled.completedAt, null);
  assert.deepEqual(cancelled.nextStatuses, []);
  assert.equal(cancelled.canMarkUnableToCollect, false);
  assert.equal(cancelled.pickup, null);
});

// ---- History ----

test("proof in preview: only for a parcel out for delivery, a valid image, its own parcel; never sent anywhere", async () => {
  reset();
  // A pickup and a delivery not taken out yet take no proof.
  await rejectsWith(upload(1), "TASK_STEP_NOT_ALLOWED");
  await rejectsWith(upload(6), "TASK_STEP_NOT_ALLOWED");
  // Out for delivery: checked like the backend.
  await rejectsWith(upload(7, slip("slip.gif", "image/gif")), "VALIDATION_FAILED", "file");
  await rejectsWith(upload(7, slip("big.jpg", "image/jpeg", schemas.PROOF_MAX_BYTES + 1)), "VALIDATION_FAILED", "file");
  await rejectsWith(upload(7, slip("fail-storage.jpg")), "SERVICE_UNAVAILABLE");
  const sevens = await upload(7);
  assert.equal(sevens.contentType, "image/jpeg");

  // Another parcel's photo can't be attached; DELIVERED without a photo is refused.
  await status(6, { status: "OUT_FOR_DELIVERY" });
  await rejectsWith(status(6, { status: "DELIVERED", recipientName: "Ayesha", proofPhotoId: sevens.proofPhotoId, feeCollected: true }),
    "VALIDATION_FAILED", "proofPhotoId");
  assert.equal((await parcel(6)).status, "OUT_FOR_DELIVERY");
  await rejectsWith(status(6, { status: "FAILED", failureReason: "WRONG_ADDRESS", proofPhotoId: sevens.proofPhotoId }),
    "VALIDATION_FAILED", "proofPhotoId");

  // Its own photo: delivered, and the proof can't be used twice or replaced.
  const delivered = await status(7, { status: "DELIVERED", recipientName: "Nimal", proofPhotoId: sevens.proofPhotoId });
  assert.deepEqual(delivered.proof, { recipientName: "Nimal", hasPhoto: true });
  await rejectsWith(upload(7), "TASK_STEP_NOT_ALLOWED");
});

test("sample deliveries have a sample signed slip; history shows the proof flag", async () => {
  reset();
  const delivered = await parcel(9);
  assert.deepEqual(delivered.proof, { recipientName: "Ayesha Fernando", hasPhoto: true });
  assert.match(preview.previewProofImageUrl(P(9)) ?? "", /^data:image\/svg\+xml/);
  assert.equal(preview.previewProofImageUrl(P(1)), null, "nothing for a parcel not delivered");
  const page = await get<Page>("/courier/deliveries/history", { page: 0, size: 100 });
  const deliveries = page.content.filter((item) => item.task.outcome === "DELIVERED");
  assert.ok(deliveries.length > 0);
  assert.ok(deliveries.every((item) => item.proof?.hasPhoto === true));
  assert.ok(page.content.filter((item) => item.stop === "PICKUP").every((item) => item.proof === null));
});

test("history: completed parcels only, newest first, paged; a search finds both tasks of a parcel worked twice", async () => {
  reset();
  const first = schemas.courierDeliveryPageSchema.parse(await get<Page>("/courier/deliveries/history", { page: 0, size: 20 }));
  assert.ok(first.totalElements > 20, "more than one page");
  assert.equal(first.totalPages, Math.ceil(first.totalElements / 20));
  assert.ok(first.content.every((item) => item.completed && item.nextStatuses.length === 0));
  assert.ok(first.content.every((item) => item.pickup === null && item.recipient === null), "no contacts");
  const times = first.content.map((item) => item.completedAt!);
  assert.deepEqual([...times].sort().reverse(), times, "newest completion first");
  assert.ok(!first.content.some((item) => item.parcelId === P(14)), "the cancelled parcel is never completed work");

  const tracking = (await parcel(15)).trackingNumber;
  const search = schemas.courierDeliveryPageSchema.parse(
    await get<Page>("/courier/deliveries/history", { page: 0, size: 20, trackingNumber: ` ${tracking.toLowerCase().replace(/(\d{4})/, "$1 ")} ` }),
  );
  assert.equal(search.totalElements, 2, "returned once, delivered later: one entry per task");
  assert.deepEqual(search.content.map((item) => item.task.outcome), ["DELIVERED", "RETURNED"]);

  const none = await get<Page>("/courier/deliveries/history", { page: 0, size: 20, trackingNumber: "SD0000000000" });
  assert.equal(none.totalElements, 0);
  await rejectsWith(get("/courier/deliveries/history", { page: -1, size: 20 }), "VALIDATION_FAILED", "page");
  await rejectsWith(get("/courier/deliveries/history", { page: 0, size: 101 }), "VALIDATION_FAILED", "size");
});

test("a parcel completed today shows up in history at once, while its siblings are still active", async () => {
  reset();
  await status(2, { status: "AT_BRANCH", receivedBy: "S. Silva" });
  const page = await get<Page>("/courier/deliveries/history", { page: 0, size: 5 });
  assert.equal(page.content[0].parcelId, P(2));
  assert.equal(page.content[0].task.status, "IN_PROGRESS", "the task is still in progress");
});

// ---- History entries (GET …/{parcelId}/history/{assignmentId}), as the backend ----

test("history entry: each finished entry opens its own task, read-only, history up to its end, proof only on the delivery", async () => {
  reset();
  const page = schemas.courierDeliveryPageSchema.parse(await get<Page>("/courier/deliveries/history", { page: 0, size: 100 }));
  assert.ok(page.content.length > 0, "the sample has finished entries");
  for (const item of page.content) {
    const entry = schemas.courierDeliveryDetailSchema.parse(
      await get(`/courier/deliveries/${item.parcelId}/history/${item.task.assignmentId}`),
    );
    assert.equal(entry.task.assignmentId, item.task.assignmentId, "that entry's own task, never the latest one");
    assert.equal(entry.task.outcome, item.task.outcome);
    assert.deepEqual(entry.nextStatuses, [], "read-only");
    assert.equal(entry.canMarkUnableToCollect, false);
    assert.equal(entry.pickup, null);
    assert.equal(entry.recipient, null);
    if (entry.completedAt) {
      for (const event of entry.history) assert.ok(event.occurredAt <= entry.completedAt, "nothing after the entry finished");
    }
    const delivered = entry.task.type === "DELIVERY" && entry.task.outcome === "DELIVERED";
    if (!delivered) assert.equal(entry.proof, null, "no delivery proof on a pickup, returned or not-taken entry");
    if (!delivered) assert.equal(item.proof, null, "nor on its history row");
  }
});

test("history entry: an open step, an unknown task or a parcel not in the task is not found", async () => {
  reset();
  const now = await today();
  const open = now.items.find((item) => !item.completed);
  assert.ok(open, "the sample has active work");
  await rejectsWith(get(`/courier/deliveries/${open.parcelId}/history/${open.task.assignmentId}`), "NOT_FOUND");
  await rejectsWith(get(`/courier/deliveries/${open.parcelId}/history/00000000-0000-4000-8000-000000000000`), "NOT_FOUND");
  const page = schemas.courierDeliveryPageSchema.parse(await get<Page>("/courier/deliveries/history", { page: 0, size: 100 }));
  const finished = page.content[0];
  // A parcel that isn't in that task.
  await rejectsWith(get(`/courier/deliveries/${P(9999)}/history/${finished.task.assignmentId}`), "NOT_FOUND");
});

test("history filters in preview: type, outcome and completion days, applied before paging, with the backend's errors", async () => {
  reset();
  const all = schemas.courierDeliveryPageSchema.parse(await get<Page>("/courier/deliveries/history", { page: 0, size: 100 }));
  const pickups = schemas.courierDeliveryPageSchema.parse(await get<Page>("/courier/deliveries/history", { page: 0, size: 100, type: "PICKUP" }));
  assert.ok(pickups.content.every((item) => item.task.type === "PICKUP"));
  assert.equal(pickups.totalElements, all.content.filter((item) => item.task.type === "PICKUP").length);
  const delivered = schemas.courierDeliveryPageSchema.parse(await get<Page>("/courier/deliveries/history", { page: 0, size: 100, outcome: "DELIVERED" }));
  assert.ok(delivered.content.every((item) => item.task.outcome === "DELIVERED"));
  const none = schemas.courierDeliveryPageSchema.parse(await get<Page>("/courier/deliveries/history", { page: 0, size: 100, completedTo: "2000-01-01" }));
  assert.equal(none.totalElements, 0);
  await rejectsWith(get("/courier/deliveries/history", { type: "TRANSFER" }), "VALIDATION_FAILED", "type");
  await rejectsWith(get("/courier/deliveries/history", { completedFrom: "2026-11-21", completedTo: "2026-11-01" }), "VALIDATION_FAILED", "completedTo");
});
