"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import { webhooksApi } from "../api";
import type { Webhook } from "../types";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

type State =
  | { status: "loading"; webhooks: undefined; error: undefined }
  | { status: "ready"; webhooks: Webhook[]; error: undefined }
  | { status: "error"; webhooks: undefined; error: string };

/**
 * The merchant's webhooks. Changes made in dialogs update the list in place (`upsert`), so the table never flashes
 * back to a loading state after an action; `reload` fetches the list again from the server.
 */
export function useWebhooks() {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<State>({ status: "loading", webhooks: undefined, error: undefined });

  React.useEffect(() => {
    const controller = new AbortController();
    webhooksApi
      .list(controller.signal)
      .then((webhooks) => setState({ status: "ready", webhooks, error: undefined }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", webhooks: undefined, error: isApiError(error) ? error.message : UNKNOWN_ERROR });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = React.useCallback(() => {
    setState({ status: "loading", webhooks: undefined, error: undefined });
    setAttempt((value) => value + 1);
  }, []);

  /** Fetches the list again but keeps the rows on screen until the answer arrives (e.g. after 409 WEBHOOK_CHANGED). */
  const refresh = React.useCallback(() => setAttempt((value) => value + 1), []);

  /** Adds a new webhook at the top (newest first) or replaces the one with the same id. */
  const upsert = React.useCallback((webhook: Webhook) => {
    setState((current) => {
      if (current.status !== "ready") return current;
      const exists = current.webhooks.some((item) => item.id === webhook.id);
      const webhooks = exists
        ? current.webhooks.map((item) => (item.id === webhook.id ? toWebhook(webhook) : item))
        : [toWebhook(webhook), ...current.webhooks];
      return { ...current, webhooks };
    });
  }, []);

  return { ...state, reload, refresh, upsert };
}

/** Drops the secret if a create/rotate response is passed in: it must never stay in the list's state. */
function toWebhook(webhook: Webhook): Webhook {
  const { id, url, eventTypes, active, createdAt, updatedAt } = webhook;
  return { id, url, eventTypes, active, createdAt, updatedAt };
}
