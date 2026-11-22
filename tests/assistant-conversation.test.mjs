import assert from "node:assert/strict";
import test from "node:test";
import { cleanQuestion, MAX_SENT, toRequest } from "../src/features/assistant/conversation.ts";
import { lineDetail, priceCaption } from "../src/features/assistant/price-text.ts";
import { reportFileName, reportToCsv } from "../src/features/assistant/report-csv.ts";

const turn = (role, text) => ({ id: text, role, text, cards: [] });

test("the request holds only role and text, oldest first", () => {
  const request = toRequest([turn("user", "Hi"), turn("assistant", "Hello"), turn("user", "Track SD2611004817")]);
  assert.deepEqual(request, [
    { role: "user", text: "Hi" },
    { role: "assistant", text: "Hello" },
    { role: "user", text: "Track SD2611004817" },
  ]);
});

test("only the newest 20 messages are sent, starting with a user message", () => {
  const long = Array.from({ length: 25 }, (_, i) => turn(i % 2 === 0 ? "user" : "assistant", `m${i}`));
  const request = toRequest(long);
  // The newest 20 are m5..m24; m5 is an assistant message, so it is dropped.
  assert.equal(request.length, MAX_SENT - 1);
  assert.equal(request[0].text, "m6");
  assert.equal(request[0].role, "user");
  assert.equal(request.at(-1)?.text, "m24");
});

test("nothing is sent when the last message is not the user's", () => {
  assert.deepEqual(toRequest([]), []);
  assert.deepEqual(toRequest([turn("user", "Hi"), turn("assistant", "Hello")]), []);
});

test("questions are trimmed and limited to 500 characters", () => {
  assert.equal(cleanQuestion("   "), null);
  assert.equal(cleanQuestion("  Where is my parcel?  "), "Where is my parcel?");
  assert.equal(cleanQuestion("x".repeat(600))?.length, 500);
});

const report = {
  period: "WEEKLY",
  title: "Weekly report",
  from: "2026-11-16",
  to: "2026-11-22",
  countedTo: "2026-11-19",
  partial: true,
  rangeText: "16 Nov 2026 to 22 Nov 2026 (up to 19 Nov 2026)",
  booked: 12,
  delivered: 8,
  failed: 4,
  successRate: 66.7,
  previous: {
    from: "2026-11-09",
    to: "2026-11-12",
    text: "the same days of the week before",
    booked: 8,
    delivered: 6,
    failed: 1,
    successRate: 85.7,
  },
  changes: {
    booked: { difference: 4, percent: 50 },
    delivered: { difference: 2, percent: 33.3 },
    failed: { difference: 3, percent: 300 },
  },
  perDay: [{ date: "2026-11-16", dateText: "Mon 16 Nov", booked: 3, delivered: 2, failed: 1 }],
  topPickupDistricts: [{ district: "Colombo", count: 9 }],
  topDropOffDistricts: [],
  failureReasons: [{ reason: 'the recipient wasn\'t available, "again"', count: 2 }],
  statusNow: [{ status: "CREATED", label: "Waiting for pickup", count: 5 }],
  accountsNow: { total: 30, customers: 20, merchants: 5, couriers: 3, dispatchers: 1, pendingMerchants: 2 },
};

test("the report CSV has every section, with commas and quotes escaped", () => {
  const lines = reportToCsv(report).split("\r\n");
  assert.equal(lines[1], "Period,16 Nov 2026 to 22 Nov 2026 (up to 19 Nov 2026)");
  assert.ok(lines.includes("Booked,12,8,4,50"));
  assert.ok(lines.includes("2026-11-16,3,2,1"));
  assert.ok(lines.includes("Colombo,9"));
  assert.ok(lines.includes('"the recipient wasn\'t available, ""again""",2'));
  assert.ok(lines.includes("Merchants waiting for approval,2"));
  assert.equal(reportFileName(report), "swiftdrop-weekly-report-2026-11-16.csv");
});

// The rate card example from the server: 2.5 kg, 40 x 30 x 12 cm, Colombo to Kandy.
const price = {
  pickupDistrict: "Colombo",
  dropOffDistrict: "Kandy",
  weightKg: 2.5,
  status: "COMPLETE",
  currency: "LKR",
  total: 522.6,
  billableWeightKg: 3,
  vehicle: "BIKE",
  vehicleText: "bike",
  sizeCm: "40 x 30 x 12",
  distanceKm: 122.6,
  lines: [
    { component: "WEIGHT", amount: 100 },
    { component: "PICKUP", amount: 150 },
    { component: "DELIVERY", amount: 150 },
    { component: "LINEHAUL", amount: 122.6 },
  ],
  note: "Full estimate.",
};

test("the price card shows the size and the vehicle", () => {
  assert.equal(priceCaption(price), "40 x 30 x 12 cm, by bike");
  assert.equal(priceCaption({ ...price, vehicleText: null }), "40 x 30 x 12 cm");
  assert.equal(priceCaption({ ...price, sizeCm: undefined, vehicleText: null }), null);
});

test("each fee line says what it was worked out from", () => {
  assert.deepEqual(
    price.lines.map((line) => lineDetail(price, line.component)),
    [" (billed as 3 kg)", " (bike)", " (bike)", " (122.6 km)"],
  );
  // The server's figures are shown as sent: the card never works out a number itself.
  assert.equal(price.lines.reduce((sum, line) => sum + line.amount, 0).toFixed(2), price.total.toFixed(2));
});

test("a fee line without its detail gets none", () => {
  const manual = { ...price, status: "MANUAL_QUOTE", total: null, vehicle: null, vehicleText: null };
  assert.equal(lineDetail(manual, "PICKUP"), null);
  assert.equal(lineDetail({ ...price, distanceKm: 0 }, "LINEHAUL"), null);
  assert.equal(lineDetail({ ...price, billableWeightKg: null }, "WEIGHT"), null);
  assert.equal(lineDetail(price, "COD"), null);
});
