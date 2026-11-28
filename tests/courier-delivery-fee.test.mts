import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

/*
 * The delivery fee on the courier screens: the fee, how it is paid and its payment status on cards and the parcel
 * page; the reminder to collect it (AT_PICKUP from the sender, AT_DROP_OFF from the recipient) only while it is unpaid
 * and only on a live step; the "I collected the delivery fee" confirmation exactly where the backend asks for it
 * (`collectOn`); green "Delivery fee collected" / "Already Paid" only from a recorded payment (never because ONLINE was
 * chosen); the fee kept apart from the cash on delivery; and the preview simulating all of it without a request.
 * Fixtures follow API.md "Courier".
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
type DeliveryFee = import("../src/features/courier/types").DeliveryFee;
type Task = import("../src/features/courier/types").CourierTask;

const TASK_ID = "c6dd7fdd-ecf6-48b7-8eb5-253117887001";
const PARCEL_ID = "ab598d39-d554-42f5-b609-6fa90f3a5357";

const CONTACT = {
  name: "Nimal Perera",
  phone: "+94771234567",
  address: "45 Peradeniya Road",
  city: "Kandy",
  district: "KANDY",
};

/** A fee as the backend sends it; the status follows the method unless given. */
function fee(paymentMethod: DeliveryFee["paymentMethod"], overrides: Partial<DeliveryFee> = {}): DeliveryFee {
  const status: DeliveryFee["status"] =
    paymentMethod === null
      ? "NOT_RECORDED"
      : paymentMethod === "ONLINE"
        ? "AWAITING_ONLINE_VERIFICATION"
        : "AWAITING_CASH_COLLECTION";
  return { amount: 522.6, currency: "LKR", paymentMethod, status, collectedAt: null, collectOn: null, ...overrides };
}

const collected = (method: "AT_PICKUP" | "AT_DROP_OFF") =>
  fee(method, { status: "CASH_COLLECTED", collectedAt: "2026-11-05T03:00:00Z" });

/** An open pickup step, not collected yet (PENDING): PICKED_UP is allowed and collects the AT_PICKUP fee. */
function pickup(overrides: Partial<Delivery> = {}, task: Partial<Task> = {}): Delivery {
  return {
    parcelId: PARCEL_ID,
    trackingNumber: "SD2611004817",
    status: "CREATED",
    stop: "PICKUP",
    pickup: CONTACT,
    recipient: null,
    from: { city: "Delgoda", district: "GAMPAHA" },
    to: { city: "Kandy", district: "KANDY" },
    weightKg: 1.2,
    codAmount: null,
    deliveryFee: fee("AT_PICKUP", { collectOn: "PICKED_UP" }),
    instructions: null,
    assignedAt: "2026-11-05T02:30:00Z",
    updatedAt: "2026-11-05T02:30:00Z",
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

/** An open delivery step, out for delivery (LOADED): DELIVERED or FAILED; DELIVERED collects the AT_DROP_OFF fee. */
function delivery(overrides: Partial<Delivery> = {}, task: Partial<Task> = {}): Delivery {
  return {
    ...pickup(),
    status: "OUT_FOR_DELIVERY",
    stop: "DELIVERY",
    pickup: null,
    recipient: CONTACT,
    codAmount: 2450,
    deliveryFee: fee("AT_DROP_OFF", { collectOn: "DELIVERED" }),
    nextStatuses: ["DELIVERED", "FAILED"],
    canMarkUnableToCollect: false,
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

/** The same step, finished (completed in a completed task). */
function finished(item: Delivery, outcome: Task["outcome"]): Delivery {
  return {
    ...item,
    nextStatuses: [],
    canMarkUnableToCollect: false,
    completed: true,
    completedAt: "2026-11-05T06:00:00Z",
    pickup: null,
    recipient: null,
    deliveryFee: item.deliveryFee ? { ...item.deliveryFee, collectOn: null } : null,
    task: { ...item.task, status: "COMPLETED", outcome },
  };
}

const districtName = (code: string) => code.charAt(0) + code.slice(1).toLowerCase();

type FeeModule = typeof import("../src/features/courier/lib/delivery-fee");
type SchemasModule = typeof import("../src/features/courier/schemas");
type CardModule = typeof import("../src/features/courier/components/parcel-card");
type ErrorsModule = typeof import("../src/features/courier/lib/errors");
type PreviewModule = typeof import("../src/features/courier/preview/preview-api");
type ClientModule = typeof import("../src/lib/api/client");

process.env.NEXT_PUBLIC_API_URL = "http://api.test/api/v1";
const React = nodeRequire("react") as typeof import("react");
const { renderToStaticMarkup } = nodeRequire("react-dom/server") as typeof import("react-dom/server");
const fees = loadTsModule<FeeModule>("@/features/courier/lib/delivery-fee");
const schemas = loadTsModule<SchemasModule>("@/features/courier/schemas");
const { ParcelCard } = loadTsModule<CardModule>("@/features/courier/components/parcel-card");
const errors = loadTsModule<ErrorsModule>("@/features/courier/lib/errors");
const preview = loadTsModule<PreviewModule>("@/features/courier/preview/preview-api");
const { ApiError } = loadTsModule<ClientModule>("@/lib/api/client");

const cardHtml = (item: Delivery) =>
  renderToStaticMarkup(
    React.createElement("ul", null, React.createElement(ParcelCard, { delivery: item, districtName, onAction: () => undefined })),
  );
/** The card's visible text, tags removed and whitespace collapsed. */
const cardText = (item: Delivery) =>
  cardHtml(item)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

// ---- Payment words and indicators ----

test("payment words: ONLINE is 'Online' with no collection needed; older parcels say not recorded", () => {
  assert.equal(fees.paymentMethodText(fee("ONLINE")), "Online");
  assert.equal(fees.paymentMethodText(fee("ONLINE", { status: "ONLINE_VERIFIED" })), "Online");
  for (const online of [fee("ONLINE"), fee("ONLINE", { status: "ONLINE_VERIFIED" })]) {
    assert.equal(fees.feeCollectionNote(online), "No delivery fee collection required");
  }
  for (const other of [fee("AT_PICKUP"), fee("AT_DROP_OFF"), fee(null), null]) {
    assert.equal(fees.feeCollectionNote(other), null);
  }
  assert.equal(fees.paymentMethodText(fee("AT_PICKUP")), "Cash at pickup – the sender pays");
  assert.equal(fees.paymentMethodText(fee("AT_DROP_OFF")), "Cash at drop-off – the recipient pays");
  assert.equal(fees.paymentMethodText(fee(null)), "Payment method not recorded");
});

test("the paid indicator comes only from a recorded payment", () => {
  assert.equal(fees.feePaidLabel(collected("AT_PICKUP")), "Delivery fee collected");
  assert.equal(fees.feePaidLabel(fee("ONLINE", { status: "ONLINE_VERIFIED" })), "Already Paid");
  for (const unpaid of [fee("ONLINE"), fee("AT_PICKUP"), fee("AT_DROP_OFF"), fee(null), null]) {
    assert.equal(fees.feePaidLabel(unpaid), null);
  }
});

test("fee amounts: rupees as Rs., any other currency with its code", () => {
  assert.equal(fees.formatFee(fee("ONLINE")), "Rs. 522.60");
  assert.equal(fees.formatFee(fee("ONLINE", { amount: 12.5, currency: "USD" })), "USD 12.50");
});

// ---- What to collect ----

test("AT_PICKUP: collect from the sender while the parcel can be picked up and the fee is unpaid", () => {
  assert.equal(fees.cashToCollect(pickup(), true)?.summary, "Collect Rs. 522.60 delivery fee from the sender");
  // Picked up, on the way to the branch: the sender is gone.
  assert.equal(
    fees.cashToCollect(pickup({ status: "PICKED_UP", nextStatuses: ["AT_BRANCH"] }, { outcome: "COLLECTED" }), true),
    null,
  );
  // Already collected: no reminder.
  assert.equal(fees.cashToCollect(pickup({ deliveryFee: collected("AT_PICKUP") }), true), null);
});

test("AT_DROP_OFF: collect from the recipient while unpaid; with COD shown apart, total only in one currency", () => {
  assert.deepEqual(fees.cashToCollect(delivery(), true), {
    payer: "recipient",
    fee: "Rs. 522.60",
    cod: "Rs. 2,450.00",
    total: "Rs. 2,972.60",
    summary: "Collect Rs. 2,972.60 in cash from the recipient",
  });
  assert.equal(fees.cashToCollect(delivery({ codAmount: null }), true)?.summary, "Collect Rs. 522.60 delivery fee from the recipient");
  const otherCurrency = fees.cashToCollect(delivery({ deliveryFee: fee("AT_DROP_OFF", { amount: 12.5, currency: "USD" }) }), true);
  assert.equal(otherCurrency?.total, null);
  assert.equal(otherCurrency?.summary, "Collect the delivery fee and cash on delivery from the recipient");
  // Failed and going back: the fee isn't collected; COD reminder as before.
  assert.equal(fees.cashToCollect(delivery({}, { outcome: "FAILED" }), true)?.summary, "Collect Rs. 2,450.00 in cash");
  // Collected: only the COD is left, and no total.
  assert.deepEqual(fees.cashToCollect(delivery({ deliveryFee: collected("AT_DROP_OFF") }), true), {
    payer: "recipient",
    fee: null,
    cod: "Rs. 2,450.00",
    total: null,
    summary: "Collect Rs. 2,450.00 in cash",
  });
});

test("AT_PICKUP with COD: the fee at pickup, only the COD at delivery", () => {
  assert.equal(fees.cashToCollect(pickup({ codAmount: 3200 }), true)?.summary, "Collect Rs. 522.60 delivery fee from the sender");
  assert.equal(
    fees.cashToCollect(delivery({ codAmount: 3200, deliveryFee: collected("AT_PICKUP") }), true)?.summary,
    "Collect Rs. 3,200.00 in cash",
  );
});

test("ONLINE, not recorded, or nothing live: no fee to collect", () => {
  for (const deliveryFee of [fee("ONLINE"), fee("ONLINE", { status: "ONLINE_VERIFIED" }), fee(null), null]) {
    assert.equal(fees.cashToCollect(pickup({ deliveryFee }), true), null);
    assert.equal(fees.cashToCollect(delivery({ deliveryFee }), true)?.fee, null);
  }
  assert.equal(fees.cashToCollect(pickup(), false), null);
  assert.equal(fees.cashToCollect(delivery(), false), null);
});

// ---- The confirmation ----

test("the confirmation box appears exactly where the backend collects the fee (collectOn)", () => {
  assert.equal(fees.feeConfirmationLabel(pickup(), "PICKED_UP"), "I collected the Rs. 522.60 delivery fee from the sender");
  assert.equal(fees.feeConfirmationLabel(delivery(), "DELIVERED"), "I collected the Rs. 522.60 delivery fee from the recipient");
  assert.equal(fees.feeConfirmationLabel(pickup(), "DELIVERED"), null);
  assert.equal(fees.feeConfirmationLabel(delivery({ deliveryFee: collected("AT_DROP_OFF") }), "DELIVERED"), null);
  assert.equal(fees.feeConfirmationLabel(pickup({ deliveryFee: fee("ONLINE") }), "PICKED_UP"), null);
  assert.equal(fees.feeConfirmationLabel(pickup({ deliveryFee: null }), "PICKED_UP"), null);
});

test("requests: feeCollected only when confirmed, only with PICKED_UP or DELIVERED, never an amount", () => {
  const values = { note: "" };
  assert.deepEqual(schemas.confirmStepRequest("PICKED_UP", values, true), { status: "PICKED_UP", note: undefined, feeCollected: true });
  assert.deepEqual(schemas.confirmStepRequest("PICKED_UP", values), { status: "PICKED_UP", note: undefined });
  assert.deepEqual(schemas.confirmStepRequest("OUT_FOR_DELIVERY", values, true), { status: "OUT_FOR_DELIVERY", note: undefined });
  const named = { recipientName: "Nimal Perera", note: "" };
  assert.deepEqual(schemas.deliveredRequest(named, "photo-id", true), {
    status: "DELIVERED",
    recipientName: "Nimal Perera",
    proofPhotoId: "photo-id",
    note: undefined,
    feeCollected: true,
  });
  assert.equal("feeCollected" in schemas.deliveredRequest(named, "photo-id"), false);
});

test("dialogs: the box blocks confirming until ticked, and the pickup's reminder is the box itself", () => {
  const source = readSource("features/courier/components/parcel-action-dialog.tsx");
  assert.match(source, /submitDisabled=\{!fee\.ready\}/);
  assert.match(source, /submitDisabled=\{!isValid \|\| !photoReady \|\| !fee\.ready \|\| !cod\.ready\}/);
  assert.match(source, /if \(!fee\.check\(\)\) return;/);
  assert.match(source, /confirmStepRequest\(status, confirmStepSchema\.parse\(values\), fee\.confirmed\)/);
  assert.match(source, /deliveredRequest\(parsed, proofPhotoId, feeCollected\)/);
  assert.equal(fees.FEE_CONFIRMATION_REQUIRED, "Collect the delivery fee and tick this box to continue.");
});

// ---- Errors ----

test("a duplicate collection reloads the parcel (nothing was saved)", () => {
  for (const code of ["FEE_ALREADY_COLLECTED", "FEE_COLLECTION_NOT_ALLOWED"] as const) {
    const described = errors.describeCourierError(new ApiError({ status: 409, code, message: "Already paid." }));
    assert.equal(described.kind, "stale");
    assert.equal(described.reload, true);
  }
});

// ---- Schemas ----

test("schema: the fee with its status; null when an older backend leaves it out; unknown values refused", () => {
  const parsed = schemas.courierDeliverySchema.parse(pickup());
  assert.deepEqual(parsed.deliveryFee, fee("AT_PICKUP", { collectOn: "PICKED_UP" }));
  const { deliveryFee: _unused, ...withoutFee } = pickup();
  void _unused;
  assert.equal(schemas.courierDeliverySchema.parse(withoutFee).deliveryFee, null);
  assert.throws(() => schemas.courierDeliverySchema.parse(pickup({ deliveryFee: { ...fee("AT_PICKUP"), status: "PAID" as never } })));
  assert.throws(() => schemas.courierDeliverySchema.parse(pickup({ deliveryFee: { ...fee("AT_PICKUP"), collectOn: "AT_BRANCH" as never } })));
});

// ---- Parcel card ----

test("card: fee, method and the green indicator only when the backend recorded the payment", () => {
  assert.match(cardText(pickup()), /Delivery fee Rs\. 522\.60 · Cash at pickup – the sender pays/);
  const paid = cardHtml(finished(delivery({ status: "DELIVERED", deliveryFee: collected("AT_DROP_OFF") }), "DELIVERED"));
  assert.match(paid, /Delivery fee collected/);
  assert.match(paid, /success/, "the badge uses the success (green) tone");
  const verified = cardText(pickup({ deliveryFee: fee("ONLINE", { status: "ONLINE_VERIFIED" }) }));
  assert.match(verified, /Rs\. 522\.60 · Online No delivery fee collection required Already Paid/);
  const unverified = cardText(pickup({ deliveryFee: fee("ONLINE") }));
  assert.match(unverified, /Rs\. 522\.60 · Online No delivery fee collection required/);
  assert.doesNotMatch(unverified, /Already Paid|Delivery fee collected/);
  assert.match(cardText(pickup({ deliveryFee: fee(null) })), /Payment method not recorded/);
});

test("card: reminders only while unpaid and live; gone after collection and on finished parcels", () => {
  assert.match(cardText(pickup()), /Collect Rs\. 522\.60 delivery fee from the sender/);
  assert.doesNotMatch(cardText(pickup({ deliveryFee: collected("AT_PICKUP") })), /Collect Rs/);
  const both = cardText(delivery());
  assert.match(both, /Delivery fee Rs\. 522\.60/);
  assert.match(both, /Cash on delivery Rs\. 2,450\.00/);
  assert.match(both, /Total cash Rs\. 2,972\.60/);
  const done = cardText(finished(delivery({ status: "DELIVERED", deliveryFee: collected("AT_DROP_OFF") }), "DELIVERED"));
  assert.doesNotMatch(done, /Collect/);
  // A failed delivery being returned: no fee reminder, the fee stays unpaid.
  const failed = cardText(delivery({ status: "FAILED", nextStatuses: ["AT_BRANCH"], codAmount: null, deliveryFee: fee("AT_DROP_OFF") }, { outcome: "FAILED" }));
  assert.doesNotMatch(failed, /delivery fee from/);
  assert.doesNotMatch(failed, /Delivery fee collected/);
});

test("parcel page: fee rows read-only on history entries, the badge and when it was collected", () => {
  const source = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(source, /const actionable = !historical && phase === "active";/);
  assert.match(source, /cashToCollect\(delivery, actionable\)/);
  assert.match(source, /<FeePaidBadge fee=\{fee\} \/>/);
  assert.match(source, /"Verified" : "Collected"\} \{formatDateTime\(fee\.collectedAt\)\}/);
});

test("no screen claims a payment without the backend's status", () => {
  for (const file of [
    "features/courier/components/parcel-card.tsx",
    "features/courier/components/parcel-detail-view.tsx",
    "features/courier/components/parcel-action-dialog.tsx",
  ]) {
    assert.doesNotMatch(readSource(file), /Already Paid/i, `${file} takes the words from lib/delivery-fee`);
  }
  assert.match(readSource("features/courier/lib/delivery-fee.ts"), /if \(fee\?\.status === "ONLINE_VERIFIED"\) return "Already Paid";/);
});

test("ONLINE with COD: no fee reminder or box, the COD is still collected", () => {
  const online = delivery({ deliveryFee: fee("ONLINE") });
  assert.equal(fees.cashToCollect(online, true)?.summary, "Collect Rs. 2,450.00 in cash");
  assert.equal(fees.feeConfirmationLabel(online, "DELIVERED"), null);
  const text = cardText(online);
  assert.match(text, /Collect Rs\. 2,450\.00 in cash/);
  assert.doesNotMatch(text, /delivery fee from|Total cash/);
});

test("parcel page: the Assignment card keeps its heading and details without the explanatory line", () => {
  const source = readSource("features/courier/components/parcel-detail-view.tsx");
  assert.match(source, /title="Assignment"/);
  assert.match(source, /Task status<\/dt>/);
  assert.doesNotMatch(source, /The task your dispatcher gave you/);
  assert.match(source, /feeCollectionNote\(fee\)/);
});

// ---- Preview mode ----

/** Sample parcel ids (preview/data.ts): 7e570000-0000-4000-8000-0000000000NN. */
const P = (n: number) => `7e570000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const NOW = new Date("2026-11-05T06:30:00Z");

function resetPreview() {
  preview.resetCourierPreview(NOW, { delayMs: 0 });
  globalThis.fetch = (async () => {
    throw new Error("preview mode must never call fetch");
  }) as typeof fetch;
}
const previewParcel = async (n: number) =>
  schemas.courierDeliveryDetailSchema.parse(await preview.courierPreviewFetch(`/courier/deliveries/${P(n)}`));
const previewStatus = async (n: number, body: unknown) =>
  schemas.courierDeliveryDetailSchema.parse(
    await preview.courierPreviewFetch(`/courier/deliveries/${P(n)}/status`, { method: "POST", body }),
  );
async function previewError(n: number, body: unknown) {
  try {
    await previewStatus(n, body);
  } catch (error) {
    return error as InstanceType<typeof ApiError>;
  }
  throw new Error("expected the preview to refuse");
}

test("preview: an AT_PICKUP pickup needs the fee confirmed, then shows it collected", async () => {
  resetPreview();
  const before = await previewParcel(1);
  assert.equal(before.deliveryFee?.status, "AWAITING_CASH_COLLECTION");
  assert.equal(before.deliveryFee?.collectOn, "PICKED_UP");

  const missing = await previewError(1, { status: "PICKED_UP" });
  assert.equal(missing.status, 400);
  assert.match(missing.fieldErrors?.feeCollected ?? "", /^Confirm that you collected the delivery fee of LKR /);

  const after = await previewStatus(1, { status: "PICKED_UP", feeCollected: true });
  assert.equal(after.deliveryFee?.status, "CASH_COLLECTED");
  assert.equal(after.deliveryFee?.collectOn, null);
  assert.notEqual(after.deliveryFee?.collectedAt, null);
});

test("preview: AT_DROP_OFF at delivery, ONLINE and legacy never collected, wrong steps refused", async () => {
  resetPreview();
  // #16: out for delivery, AT_DROP_OFF, no COD.
  assert.equal((await previewParcel(16)).deliveryFee?.collectOn, "DELIVERED");
  const failed = await previewStatus(16, { status: "FAILED", failureReason: "RECIPIENT_REFUSED" });
  assert.equal(failed.deliveryFee?.status, "AWAITING_CASH_COLLECTION");
  assert.equal(failed.deliveryFee?.collectOn, null);
  const onReturn = await previewError(16, { status: "AT_BRANCH", receivedBy: "S. Silva", feeCollected: true });
  assert.equal(onReturn.fieldErrors?.feeCollected, "Only when you pick up or deliver the parcel.");

  // #4 ONLINE, #5 legacy: never blocked, never collected in cash.
  assert.equal((await previewError(4, { status: "PICKED_UP", feeCollected: true })).fieldErrors?.feeCollected,
    "This delivery fee is paid online: there is no cash to collect.");
  assert.equal((await previewStatus(4, { status: "PICKED_UP" })).deliveryFee?.status, "AWAITING_ONLINE_VERIFICATION");
  assert.equal((await previewStatus(5, { status: "PICKED_UP" })).deliveryFee?.status, "NOT_RECORDED");

  // #18: AT_PICKUP fee collected at pickup; at delivery only the COD is left, a second collection is refused.
  const later = await previewParcel(18);
  assert.equal(later.deliveryFee?.status, "CASH_COLLECTED");
  assert.equal(later.codAmount, 3200);
  // As the backend: the fee rule comes after the task checks and before the photo is looked up.
  const twice = await previewError(18, { status: "DELIVERED", recipientName: "Nimal Perera", proofPhotoId: "x", feeCollected: true });
  assert.equal(twice.status, 409);
  assert.equal(twice.code, "FEE_ALREADY_COLLECTED");
});

test("preview: samples cover collected history and one verified online payment", async () => {
  resetPreview();
  // #9 delivered today (AT_DROP_OFF): collected when delivered.
  assert.equal((await previewParcel(9)).deliveryFee?.status, "CASH_COLLECTED");
  // #7 out for delivery, ONLINE: the preview's only verified online sample.
  assert.equal((await previewParcel(7)).deliveryFee?.status, "ONLINE_VERIFIED");
  // #8 failed (AT_DROP_OFF): still unpaid, nothing to collect while returning.
  const failed = await previewParcel(8);
  assert.equal(failed.deliveryFee?.status, "AWAITING_CASH_COLLECTION");
  assert.equal(failed.deliveryFee?.collectOn, null);
});

// ---- Cash on delivery confirmation (frontend only) ----

test("the delivered dialog's boxes: fee and COD apart, only for what is collected here", () => {
  const codLabel = "I collected the Rs. 2,450.00 cash on delivery from the recipient";
  const feeLabel = "I collected the Rs. 522.60 delivery fee from the recipient";
  // AT_DROP_OFF unpaid with COD: both boxes (and the notice shows both amounts and the total).
  const both = delivery();
  assert.equal(fees.feeConfirmationLabel(both, "DELIVERED"), feeLabel);
  assert.equal(fees.codConfirmationLabel(both), codLabel);
  assert.equal(fees.cashToCollect(both, true)?.total, "Rs. 2,972.60");
  // AT_DROP_OFF unpaid, no COD: only the fee box.
  const feeOnly = delivery({ codAmount: null });
  assert.equal(fees.feeConfirmationLabel(feeOnly, "DELIVERED"), feeLabel);
  assert.equal(fees.codConfirmationLabel(feeOnly), null);
  // ONLINE (verified or not) or an AT_PICKUP fee already collected, with COD: only the COD box.
  for (const deliveryFee of [fee("ONLINE"), fee("ONLINE", { status: "ONLINE_VERIFIED" }), collected("AT_PICKUP")]) {
    const codOnly = delivery({ deliveryFee });
    assert.equal(fees.feeConfirmationLabel(codOnly, "DELIVERED"), null);
    assert.equal(fees.codConfirmationLabel(codOnly), codLabel);
  }
  // Nothing to collect: no box.
  const nothing = delivery({ codAmount: null, deliveryFee: fee("ONLINE") });
  assert.equal(fees.feeConfirmationLabel(nothing, "DELIVERED"), null);
  assert.equal(fees.codConfirmationLabel(nothing), null);
  assert.equal(fees.COD_CONFIRMATION_REQUIRED, "Collect the cash on delivery and tick this box to continue.");
});

test("the COD box blocks Mark as delivered, uses the same box as the fee, and is never sent", () => {
  const source = readSource("features/courier/components/parcel-action-dialog.tsx");
  assert.match(source, /const cod = useCodConfirmation\(props\.delivery\);/);
  assert.match(source, /useCashConfirmation\(codConfirmationLabel\(delivery\), COD_CONFIRMATION_REQUIRED\)/);
  assert.match(source, /useCashConfirmation\(status \? feeConfirmationLabel\(delivery, status\) : null, FEE_CONFIRMATION_REQUIRED\)/);
  assert.match(source, /const feeReady = fee\.check\(\);\s*const codReady = cod\.check\(\);\s*if \(!feeReady \|\| !codReady\) return;/);
  assert.match(source, /\{fee\.field\}\s*\{cod\.field\}/);
  // Only the fee's confirmation goes to the backend; the request has no COD field.
  assert.match(source, /deliveredRequest\(parsed, proofPhotoId, feeCollected\)/);
  assert.doesNotMatch(readSource("features/courier/schemas.ts"), /codCollected/);
  assert.doesNotMatch(readSource("features/courier/types.ts"), /codCollected/);
});

test("preview: delivering a COD parcel still needs only what the backend needs (COD is checked in the dialog)", async () => {
  resetPreview();
  // #07: ONLINE (verified sample) with COD: nothing about the fee is asked; the COD box lives in the dialog only.
  const seven = await previewParcel(7);
  assert.equal(seven.codAmount, 1200);
  assert.equal(seven.deliveryFee?.collectOn, null);
  assert.equal(fees.codConfirmationLabel(seven), "I collected the Rs. 1,200.00 cash on delivery from the recipient");
  assert.equal(fees.feeConfirmationLabel(seven, "DELIVERED"), null);
});

// ---- Verified online payments (DeliveryApi.recordOnlinePayment, recorded by WP2) ----

test("a backend answer with a verified online payment parses and shows Already Paid, with nothing to collect", () => {
  // Exactly what the courier API answers once delivery.fee_payments holds an ONLINE row.
  const answer = {
    ...delivery({ codAmount: 1200 }),
    deliveryFee: {
      amount: 350,
      currency: "LKR",
      paymentMethod: "ONLINE",
      status: "ONLINE_VERIFIED",
      collectedAt: "2026-11-28T03:15:00.123456Z",
      collectOn: null,
    },
  };
  const parsed = schemas.courierDeliverySchema.parse(answer);
  assert.equal(parsed.deliveryFee?.status, "ONLINE_VERIFIED");
  const text = cardText(parsed);
  assert.match(text, /Rs\. 350\.00 · Online No delivery fee collection required Already Paid/);
  // Only the cash on delivery is left to collect, with its own box; no fee box.
  assert.equal(fees.cashToCollect(parsed, true)?.summary, "Collect Rs. 1,200.00 in cash");
  assert.equal(fees.feeConfirmationLabel(parsed, "DELIVERED"), null);
  assert.equal(fees.codConfirmationLabel(parsed), "I collected the Rs. 1,200.00 cash on delivery from the recipient");
});

test("an online payment that isn't verified never shows as paid", () => {
  const parsed = schemas.courierDeliverySchema.parse(delivery({ codAmount: null, deliveryFee: fee("ONLINE") }));
  const text = cardText(parsed);
  assert.doesNotMatch(text, /Already Paid|Delivery fee collected/);
  assert.match(text, /No delivery fee collection required/);
  assert.equal(fees.cashToCollect(parsed, true), null);
});
