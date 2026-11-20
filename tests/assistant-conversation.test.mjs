import assert from "node:assert/strict";
import test from "node:test";
import { cleanQuestion, MAX_SENT, toRequest } from "../src/features/assistant/conversation.ts";

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
