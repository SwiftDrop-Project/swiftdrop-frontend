// Assistant endpoints (API.md "Assistant"), built on apiFetch.
import { apiFetch } from "@/lib/api";
import type { ChatMessage, ChatResponse } from "./types";

export const assistantApi = {
  /**
   * Sends the conversation (oldest first, the user's message last). `signedIn` uses /assistant/chat/me, which knows
   * the user and can list a customer's or merchant's own parcels; the public chat ignores the login.
   */
  chat: (messages: ChatMessage[], signedIn: boolean, signal?: AbortSignal) =>
    apiFetch<ChatResponse>(signedIn ? "/assistant/chat/me" : "/assistant/chat", {
      method: "POST",
      body: { messages },
      signal,
    }),
};
