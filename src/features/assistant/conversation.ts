// What the panel sends to the assistant API: plain functions, tested in tests/assistant-conversation.test.mts.
import type { ChatMessage } from "./types";

/** The API takes at most 20 messages; the newest ones are sent. */
export const MAX_SENT = 20;
/** The newest (user's) message may be at most this long. */
export const MAX_MESSAGE_LENGTH = 500;

/**
 * The newest 20 messages, starting with a user message (the API's rule), with only role and text.
 * Returns an empty list when there is no user message to answer.
 */
export function toRequest(conversation: readonly ChatMessage[]): ChatMessage[] {
  const recent = conversation.slice(-MAX_SENT);
  const start = recent.findIndex((message) => message.role === "user");
  if (start < 0 || recent.at(-1)?.role !== "user") return [];
  return recent.slice(start).map(({ role, text }) => ({ role, text }));
}

/** The typed question, trimmed and cut to the limit; null when there is nothing to send. */
export function cleanQuestion(text: string): string | null {
  const trimmed = text.trim();
  return trimmed ? trimmed.slice(0, MAX_MESSAGE_LENGTH) : null;
}
