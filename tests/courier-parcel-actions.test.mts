import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * The courier's actions on one parcel (lib/parcel-actions.ts and the dialogs): which actions a parcel offers (only from
 * `nextStatuses` and `canMarkUnableToCollect`), the request each one sends, the pickup and delivery workflows
 * (including a failed delivery and its return to the branch), Unable to Collect, and what happens when the parcel or
 * its task changed meanwhile (409s). fetch is replaced; fixtures follow API.md "Courier".
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

const districtName = (code: string) => code.charAt(0) + code.slice(1).toLowerCase();

type ActionsModule = typeof import("../src/features/courier/lib/parcel-actions");
type ViewModule = typeof import("../src/features/courier/lib/parcel-view");
type SchemasModule = typeof import("../src/features/courier/schemas");

const actions = loadTsModule<ActionsModule>("@/features/courier/lib/parcel-actions");
const view = loadTsModule<ViewModule>("@/features/courier/lib/parcel-view");
const schemas = loadTsModule<SchemasModule>("@/features/courier/schemas");

interface Call {
  url: URL;
  method: string;
  body: unknown;
}

process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";

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

const apiError = (status: number, code: string, message = `msg ${code}`, fieldErrors?: Record<string, string>) =>
  answer(status, { status, code, message, ...(fieldErrors ? { fieldErrors } : {}) });

const kinds = (item: Delivery) =>
  actions.parcelActions(item).map((action) => `${action.kind}${"status" in action ? `:${action.status}` : ""}`);
const labels = (item: Delivery) => actions.parcelActions(item).map((action) => actions.actionLabel(action, item));

// ---- Which actions ----

test("actions come only from nextStatuses (in order), plus Unable to Collect while allowed", () => {
  assert.deepEqual(kinds(pickup()), ["confirm:PICKED_UP", "unable"]);
  assert.deepEqual(labels(pickup()), ["Mark picked up", "Unable to Collect"]);

  const collected = pickup({ status: "PICKED_UP", nextStatuses: ["AT_BRANCH"], canMarkUnableToCollect: false }, { outcome: "COLLECTED" });
  assert.deepEqual(kinds(collected), ["handover:AT_BRANCH"]);
  assert.deepEqual(labels(collected), ["Hand over at branch"]);

  const toLoad = delivery({ status: "AT_BRANCH", nextStatuses: ["OUT_FOR_DELIVERY"], canMarkUnableToCollect: true }, { outcome: "PENDING" });
  assert.deepEqual(labels(toLoad), ["Out for delivery", "Unable to Collect"]);

  assert.deepEqual(labels(delivery()), ["Delivered", "Failed"]);

  const failed = delivery({ status: "FAILED", nextStatuses: ["AT_BRANCH"] }, { outcome: "FAILED" });
  assert.deepEqual(labels(failed), ["Return to branch"], "a failed delivery is returned with AT_BRANCH");

});

test("a transfer gets no action at all, whatever the API lists; IN_TRANSIT never becomes a button", () => {
  const transfer = delivery({ status: "AT_BRANCH", recipient: null, nextStatuses: ["IN_TRANSIT"], canMarkUnableToCollect: true }, { type: "TRANSFER", outcome: "PENDING" });
  assert.deepEqual(kinds(transfer), [], "no Load for transfer, no Unable to Collect");
  const loaded = delivery({ status: "IN_TRANSIT", recipient: null, nextStatuses: ["AT_BRANCH"], canMarkUnableToCollect: false }, { type: "TRANSFER", outcome: "LOADED" });
  assert.deepEqual(kinds(loaded), [], "no handover offered for a transfer either");
  assert.equal(actions.actionForStatus("IN_TRANSIT"), null);
  // Even on a delivery, an unexpected IN_TRANSIT in nextStatuses is ignored rather than invented as an action.
  assert.deepEqual(kinds(delivery({ nextStatuses: ["IN_TRANSIT", "DELIVERED"] })), ["delivered:DELIVERED"]);
});

test("no invented actions: nothing when the API offers nothing, CREATED is never offered", () => {
  assert.deepEqual(kinds(pickup({ nextStatuses: [], canMarkUnableToCollect: false })), []);
  assert.deepEqual(kinds(pickup({ nextStatuses: ["CREATED"], canMarkUnableToCollect: false })), []);
  const cancelled = pickup({ nextStatuses: [], canMarkUnableToCollect: false }, { status: "CANCELLED" });
  assert.deepEqual(kinds(cancelled), [], "a cancelled task offers nothing");
  assert.equal(actions.isProblemAction({ kind: "failed", status: "FAILED" }), true);
  assert.equal(actions.isProblemAction({ kind: "unable" }), true);
  assert.equal(actions.isProblemAction({ kind: "handover", status: "AT_BRANCH" }), false);
});

test("dialog words: picking up and failing don't finish the parcel; the handover and return do", () => {
  const picked = actions.actionDialogText({ kind: "confirm", status: "PICKED_UP" }, pickup(), districtName);
  assert.match(picked.success, /Hand it over at Gampaha branch to finish it/);
  const handover = actions.actionDialogText({ kind: "handover", status: "AT_BRANCH" }, pickup({}, { outcome: "COLLECTED" }), districtName);
  assert.equal(handover.title, "Hand over SD 2611 0048 17 at Gampaha branch");
  assert.match(handover.description, /This finishes the parcel for you/);
  const failed = actions.actionDialogText({ kind: "failed", status: "FAILED" }, delivery(), districtName);
  assert.match(failed.success, /Return it to Colombo branch to finish it/);
  const returning = actions.actionDialogText({ kind: "handover", status: "AT_BRANCH" }, delivery({}, { outcome: "FAILED" }), districtName);
  assert.equal(returning.title, "Return SD 2611 0048 17 to Colombo branch");
  assert.match(returning.description, /it is not delivered/);
  const unable = actions.actionDialogText({ kind: "unable" }, pickup(), districtName);
  assert.equal(unable.title, "Unable to collect SD 2611 0048 17");
});

// ---- Requests ----

test("pickup workflow: PICKED_UP (not completed), then AT_BRANCH with receivedBy (completed)", async () => {
  const pickedUp = detail(pickup({ status: "PICKED_UP", nextStatuses: ["AT_BRANCH"], canMarkUnableToCollect: false }, { status: "IN_PROGRESS", outcome: "COLLECTED" }));
  let calls = answer(200, pickedUp);
  let result = await actions.submitStatus(PARCEL_ID, schemas.confirmStepRequest("PICKED_UP", { note: "" }));
  assert.deepEqual(calls[0].body, { status: "PICKED_UP" });
  assert.equal(calls[0].url.pathname, `/api/v1/courier/deliveries/${PARCEL_ID}/status`);
  assert.ok(result.ok);
  assert.equal(result.ok && result.delivery.completed, false, "PICKED_UP alone doesn't complete the pickup");

  const handedOver = detail(pickup({ status: "AT_BRANCH", pickup: null, nextStatuses: [], canMarkUnableToCollect: false, completed: true, completedAt: "2026-11-05T06:00:00Z" }, { status: "IN_PROGRESS", outcome: "HANDED_OVER", receivedBy: "S. Silva" }));
  calls = answer(200, handedOver);
  const body = schemas.handoverRequest(schemas.handoverSchema.parse({ receivedBy: "  S. Silva ", note: "Counter 2" }));
  result = await actions.submitStatus(PARCEL_ID, body);
  assert.deepEqual(calls[0].body, { status: "AT_BRANCH", receivedBy: "S. Silva", note: "Counter 2" });
  assert.ok(result.ok && result.delivery.completed, "the backend's answer completes it");
});

test("delivery workflow: out for delivery, delivered with recipientName", async () => {
  let calls = answer(200, detail(delivery()));
  await actions.submitStatus(PARCEL_ID, schemas.confirmStepRequest("OUT_FOR_DELIVERY", { note: "" }));
  assert.deepEqual(calls[0].body, { status: "OUT_FOR_DELIVERY" });

  calls = answer(200, detail(delivery({ status: "DELIVERED", recipient: null, nextStatuses: [], completed: true, completedAt: "2026-11-05T07:00:00Z", proof: { recipientName: "Nimal Perera", hasPhoto: true } }, { outcome: "DELIVERED" })));
  const result = await actions.submitStatus(PARCEL_ID, schemas.deliveredRequest(schemas.deliveredSchema.parse({ recipientName: "Nimal Perera", note: "" }), PHOTO_ID));
  assert.deepEqual(calls[0].body, { status: "DELIVERED", recipientName: "Nimal Perera", proofPhotoId: PHOTO_ID });
  assert.ok(result.ok && result.delivery.completed);
});

// ---- Proof of delivery: upload, then DELIVERED ----

const PHOTO_ID = "5f1d2c4b-0000-4000-8000-000000000001";
const uploaded = { proofPhotoId: PHOTO_ID, contentType: "image/jpeg", sizeBytes: 3, uploadedAt: "2026-11-20T10:15:00Z" };
const deliveredAnswer = () =>
  detail(
    delivery({ status: "DELIVERED", recipient: null, nextStatuses: [], completed: true, completedAt: "2026-11-05T07:00:00Z" }, { outcome: "DELIVERED", status: "COMPLETED" }),
    { proof: { recipientName: "Nimal Perera", hasPhoto: true } },
  );

/** Answers each call in turn (the upload, then the status change); records what was sent. */
function answerInTurn(...answers: [number, unknown][]) {
  const calls: { path: string; body: unknown }[] = [];
  let next = 0;
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const body = init.body instanceof FormData ? "FormData" : init.body === undefined ? undefined : JSON.parse(String(init.body));
    calls.push({ path: new URL(String(input)).pathname, body });
    const [status, answerBody] = answers[Math.min(next++, answers.length - 1)];
    return new Response(JSON.stringify(answerBody), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
const send = (cached: { file: Blob; proofPhotoId: string } | null = null) =>
  actions.submitDelivered(PARCEL_ID, { original: photo, prepared: photo, fileName: "slip.jpg" },
    (id) => schemas.deliveredRequest({ recipientName: "Nimal Perera", note: "" }, id), cached);

test("Mark as delivered uploads the slip photo first, then sends DELIVERED with its proofPhotoId", async () => {
  const calls = answerInTurn([201, uploaded], [200, deliveredAnswer()]);
  const result = await send();
  assert.deepEqual(calls.map((call) => call.path), [
    `/api/v1/courier/deliveries/${PARCEL_ID}/proof`,
    `/api/v1/courier/deliveries/${PARCEL_ID}/status`,
  ]);
  assert.equal(calls[0].body, "FormData");
  assert.deepEqual(calls[1].body, { status: "DELIVERED", recipientName: "Nimal Perera", proofPhotoId: PHOTO_ID });
  assert.ok(result.ok && result.delivery.proof?.hasPhoto);
});

test("a failed upload delivers nothing: no status change is sent", async () => {
  let calls = answerInTurn([400, { status: 400, code: "VALIDATION_FAILED", message: "Check the highlighted fields.", fieldErrors: { file: "Use a JPEG, PNG or WebP photo." } }]);
  let result = await send();
  assert.equal(calls.length, 1, "only the upload");
  assert.ok(!result.ok && result.failure.kind === "fields" && result.failure.fieldErrors.file === "Use a JPEG, PNG or WebP photo.");
  assert.ok(!result.ok && result.uploaded === null);

  calls = answerInTurn([503, { status: 503, code: "SERVICE_UNAVAILABLE", message: "This isn't available yet. Please try again later." }]);
  result = await send();
  assert.equal(calls.length, 1);
  assert.ok(!result.ok && result.failure.kind === "retry", "the storage being down can be retried");

  answerInTurn([409, { status: 409, code: "TASK_STEP_NOT_ALLOWED", message: "This step isn't possible for this parcel now." }]);
  result = await send();
  assert.ok(!result.ok && result.failure.kind === "reload", "a closed or changed step reloads");
});

test("if DELIVERED fails after the upload, the photo is kept and reused on retry (not uploaded twice)", async () => {
  let calls = answerInTurn([201, uploaded], [500, { status: 500, code: "INTERNAL_ERROR", message: "Something went wrong on our side." }]);
  const first = await send();
  assert.equal(calls.length, 2);
  assert.ok(!first.ok && first.uploaded?.proofPhotoId === PHOTO_ID);

  calls = answerInTurn([200, deliveredAnswer()]);
  const retry = await send(!first.ok ? first.uploaded : null);
  assert.deepEqual(calls.map((call) => call.path), [`/api/v1/courier/deliveries/${PARCEL_ID}/status`], "no second upload");
  assert.ok(retry.ok);
});

test("a photo the backend refuses at DELIVERED (proofPhotoId) must be uploaded again; a changed photo too", async () => {
  answerInTurn([201, uploaded], [400, { status: 400, code: "VALIDATION_FAILED", message: "Check the highlighted fields.", fieldErrors: { proofPhotoId: "Add the photo again." } }]);
  const refused = await send();
  assert.ok(!refused.ok && refused.uploaded === null);

  const calls = answerInTurn([201, uploaded], [200, deliveredAnswer()]);
  const otherFile = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 1])], { type: "image/jpeg" });
  await send({ file: otherFile, proofPhotoId: "old" });
  assert.equal(calls.length, 2, "the photo changed since the last upload: uploaded again");
});

test("the delivered dialog requires the photo and offers Take photo and Choose file", () => {
  const dialog = readSource("features/courier/components/parcel-action-dialog.tsx");
  assert.match(dialog, /<ImagePicker/);
  assert.match(
    dialog,
    /submitDisabled=\{!isValid \|\| !photoReady \|\| !fee\.ready \|\| !cod\.ready\}/,
    "confirm waits for a valid name, a photo and every cash box that applies (delivery fee, cash on delivery)",
  );
  assert.match(dialog, /submitDelivered\(/);
  const picker = readSource("components/ui/image-picker.tsx");
  assert.match(picker, /capture="environment"/, "Take photo opens the camera on phones");
  assert.match(picker, /Replace/);
  assert.match(picker, /Remove/);
  assert.match(readSource("app/dev/ui/_sections/forms.tsx"), /id="image-picker"/, "shown on /dev/ui");
});

test("failed delivery: FAILED with failureReason stays active; the AT_BRANCH return completes it", async () => {
  const today = { date: "2026-11-05", toDo: 1, done: 0, items: [delivery()] };

  const failed = detail(delivery({ status: "FAILED", nextStatuses: ["AT_BRANCH"] }, { outcome: "FAILED" }), { failureReason: "RECIPIENT_UNAVAILABLE" });
  let calls = answer(200, failed);
  let result = await actions.submitStatus(PARCEL_ID, schemas.failedRequest(schemas.failedSchema.parse({ failureReason: "RECIPIENT_UNAVAILABLE", note: " No answer " })));
  assert.deepEqual(calls[0].body, { status: "FAILED", failureReason: "RECIPIENT_UNAVAILABLE", note: "No answer" });
  assert.ok(result.ok);
  const afterFail = view.applyParcelUpdate(today, result.ok ? result.delivery : failed);
  assert.equal(afterFail.toDo, 1, "FAILED is not completed: still to do");
  assert.equal(view.groupToday(afterFail.items).deliveries.length, 1);
  assert.deepEqual(labels(afterFail.items[0]), ["Return to branch"]);

  const returned = detail(delivery({ status: "AT_BRANCH", recipient: null, nextStatuses: [], completed: true, completedAt: "2026-11-05T08:00:00Z" }, { outcome: "RETURNED", status: "COMPLETED", receivedBy: "M. Perera" }));
  calls = answer(200, returned);
  result = await actions.submitStatus(PARCEL_ID, schemas.handoverRequest({ receivedBy: "M. Perera", note: "" }));
  assert.deepEqual(calls[0].body, { status: "AT_BRANCH", receivedBy: "M. Perera" });
  const afterReturn = view.applyParcelUpdate(afterFail, result.ok ? result.delivery : returned);
  assert.equal(afterReturn.toDo, 0);
  assert.equal(afterReturn.done, 1);
  assert.equal(view.groupToday(afterReturn.items).completed.length, 1);
});

test("Unable to Collect: POST { problem, note } to its own endpoint; the backend picks the outcome", async () => {
  const notLoaded = detail(delivery({ status: "AT_BRANCH", recipient: null, nextStatuses: [], canMarkUnableToCollect: false, completed: true, completedAt: "2026-11-05T06:00:00Z" }, { outcome: "NOT_LOADED", problem: "PARCEL_MISSING" }));
  const calls = answer(200, notLoaded);
  const result = await actions.submitUnableToCollect(PARCEL_ID, schemas.unableToCollectRequest(schemas.unableToCollectSchema.parse({ problem: "PARCEL_MISSING", note: "" })));
  assert.equal(calls[0].url.pathname, `/api/v1/courier/deliveries/${PARCEL_ID}/unable-to-collect`);
  assert.deepEqual(calls[0].body, { problem: "PARCEL_MISSING" });
  assert.ok(result.ok && result.delivery.completed);
  assert.equal(result.ok && result.delivery.status, "AT_BRANCH", "the parcel's own status doesn't change");
});

// ---- Failures ----

test("conflicts reload: ASSIGNMENT_CHANGED explains the dispatcher changed the task; nothing is kept open", async () => {
  apiError(409, "ASSIGNMENT_CHANGED", "The dispatcher changed this task. Refresh and try again.");
  let result = await actions.submitStatus(PARCEL_ID, { status: "PICKED_UP" });
  assert.deepEqual(result, {
    ok: false,
    failure: { kind: "reload", title: "Your dispatcher changed this task", message: "The dispatcher changed this task. Refresh and try again." },
  });

  for (const [code, title] of [
    ["ASSIGNMENT_CLOSED", "This task is closed"],
    ["TASK_STEP_NOT_ALLOWED", "This parcel has changed"],
    ["INVALID_STATUS_TRANSITION", "This parcel has changed"],
  ] as const) {
    apiError(409, code);
    result = await actions.submitStatus(PARCEL_ID, { status: "PICKED_UP" });
    assert.ok(!result.ok && result.failure.kind === "reload" && result.failure.title === title, `${code} reloads`);
  }

  apiError(409, "TASK_STEP_NOT_ALLOWED");
  result = await actions.submitUnableToCollect(PARCEL_ID, { problem: "SENDER_UNAVAILABLE" });
  assert.ok(!result.ok && result.failure.kind === "reload", "Unable to Collect after the parcel was taken reloads");
});

test("other failures: 404 leaves, 400 keeps the field errors, anything else can be retried", async () => {
  apiError(404, "NOT_FOUND");
  let result = await actions.submitStatus(PARCEL_ID, { status: "PICKED_UP" });
  assert.ok(!result.ok && result.failure.kind === "gone");

  apiError(400, "VALIDATION_FAILED", "Check the highlighted fields.", { receivedBy: "Enter the name of the person at the branch who received the parcel." });
  result = await actions.submitStatus(PARCEL_ID, { status: "AT_BRANCH", receivedBy: "A" });
  assert.ok(!result.ok && result.failure.kind === "fields");
  assert.deepEqual(!result.ok && result.failure.kind === "fields" && result.failure.fieldErrors, {
    receivedBy: "Enter the name of the person at the branch who received the parcel.",
  });

  apiError(503, "SERVICE_UNAVAILABLE", "Try again later.");
  result = await actions.submitStatus(PARCEL_ID, { status: "PICKED_UP" });
  assert.ok(!result.ok && result.failure.kind === "retry");

  globalThis.fetch = (async () => {
    throw new TypeError("network down");
  }) as typeof fetch;
  result = await actions.submitStatus(PARCEL_ID, { status: "PICKED_UP" });
  assert.ok(!result.ok && result.failure.kind === "retry", "a network error never throws");
});

// ---- Screens wire it up safely ----

test("screens: one request at a time, refresh after a save, reload after a conflict", () => {
  const submit = readSource("features/courier/components/use-action-submit.ts");
  assert.match(submit, /useSingleFlight\(onSavingChange\)/, "a second press while saving is ignored");
  const dialog = readSource("features/courier/components/action-dialog.tsx");
  assert.match(dialog, /if \(!next && !saving\) onClose\(\)/, "the dialog can't be closed while saving");

  const today = readSource("features/courier/components/today-parcels.tsx");
  assert.match(today, /loaded\.refresh\(applyParcelUpdate\(today, updated\)\)/, "today shows the answer, then reloads");
  assert.match(today, /loaded\.reload\(\)/, "today reloads after a conflict");
  assert.match(today, /const busy = loaded\.refreshing \|\| saving \|\| target !== null/, "other buttons wait");

  const detailView = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(detailView, /onRefresh\(updated\)/);
  assert.match(detailView, /router\.replace\(courierRoutes\.today\)/, "a parcel that is gone goes back to today");

  const handover = readSource("features/courier/components/handover-dialog.tsx");
  assert.match(handover, /handoverRequest\(handoverSchema\.parse\(values\)\)/, "the handover sends the trimmed name");
  assert.doesNotMatch(handover, /parcelIds/, "one parcel at a time, no grouped handover");
});
