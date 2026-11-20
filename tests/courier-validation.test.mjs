import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReceivedBy } from "../src/features/dispatch/courier-validation.ts";

test("received-by names are trimmed and limited to 2 through 100 characters", () => {
  assert.equal(normalizeReceivedBy(" A "), null);
  assert.equal(normalizeReceivedBy("  "), null);
  assert.equal(normalizeReceivedBy(" Ada "), "Ada");
  assert.equal(normalizeReceivedBy("x".repeat(100)), "x".repeat(100));
  assert.equal(normalizeReceivedBy("x".repeat(101)), null);
});
