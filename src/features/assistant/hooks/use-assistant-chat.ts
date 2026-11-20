"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError, retryMessage } from "@/lib/api";
import { assistantApi } from "../api";
import { MAX_SENT, cleanQuestion, toRequest } from "../conversation";
import type { ShownMessage } from "../types";

const STORAGE_KEY = "swiftdrop.assistant.";

function load(key: string): ShownMessage[] {
  try {
    const stored = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    return Array.isArray(stored) ? (stored as ShownMessage[]) : [];
  } catch {
    return [];
  }
}

function save(key: string, messages: ShownMessage[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(messages.slice(-MAX_SENT)));
  } catch {
    // Storage blocked (private mode): the chat still works, it just isn't kept.
  }
}

let counter = 0;
function newId() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

function errorText(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "TOO_MANY_REQUESTS") return `You've sent a lot of messages. ${retryMessage(error)}`;
    if (error.code === "UNAUTHENTICATED") return "Your session has ended. Log in again to ask about your parcels.";
    return error.fieldErrors.messages ?? error.message;
  }
  return "We couldn't get an answer. Try again.";
}

/**
 * The conversation with the assistant. It is kept for this browser tab (sessionStorage), separately for visitors and
 * logged-in users, and the newest 20 messages are sent with each question.
 */
export type AssistantChat = ReturnType<typeof useAssistantChat>;

export function useAssistantChat(signedIn: boolean) {
  const key = STORAGE_KEY + (signedIn ? "me" : "public");
  // Read once; the messages are shown only inside the panel, which opens after hydration.
  const [messages, setMessages] = useState<ShownMessage[]>(() => (typeof window === "undefined" ? [] : load(key)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const ask = useCallback(
    async (conversation: ShownMessage[]) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setPending(true);
      setError(null);
      try {
        const response = await assistantApi.chat(toRequest(conversation), signedIn, controller.signal);
        const answered = [
          ...conversation,
          { id: newId(), role: "assistant" as const, text: response.reply, cards: response.cards },
        ];
        setMessages(answered);
        save(key, answered);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(errorText(caught));
      } finally {
        if (abort.current === controller) setPending(false);
      }
    },
    [key, signedIn],
  );

  const send = useCallback(
    (text: string) => {
      const question = cleanQuestion(text);
      if (!question || pending) return;
      const next = [...messages, { id: newId(), role: "user" as const, text: question }];
      setMessages(next);
      save(key, next);
      void ask(next);
    },
    [ask, key, messages, pending],
  );

  /** Asks again after an error (the user's last message is still the last one). */
  const retry = useCallback(() => {
    if (messages.at(-1)?.role === "user") void ask(messages);
  }, [ask, messages]);

  const clear = useCallback(() => {
    abort.current?.abort();
    setPending(false);
    setError(null);
    setMessages([]);
    save(key, []);
  }, [key]);

  return { messages, pending, error, send, retry, clear };
}
