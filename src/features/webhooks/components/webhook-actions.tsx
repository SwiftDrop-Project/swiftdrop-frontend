"use client";

import Link from "next/link";
import { History, MoreHorizontal, Pencil, Power, PowerOff, RefreshCw, Send } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { toast } from "@/components/ui/toast";
import { isApiError, retryMessage } from "@/lib/api";
import { webhooksApi } from "../api";
import { TEST_COOLDOWN_SECONDS, startCooldown, useCooldown } from "../hooks/use-cooldown";
import type { Webhook } from "../types";
import { SecretDialog } from "./secret-dialog";
import { WebhookFormDialog } from "./webhook-form-dialog";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : UNKNOWN_ERROR;
}

/** "shop.example.com" for messages; the full URL can hold tokens, so it's never repeated in a toast. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

type OpenDialog = "edit" | "rotate" | "turnOff" | null;

/** 409 WEBHOOK_CHANGED: someone changed this webhook at the same moment (e.g. another tab); nothing was saved. */
export function isWebhookChanged(error: unknown): boolean {
  return isApiError(error) && error.code === "WEBHOOK_CHANGED";
}

/** The key of a webhook's "Send test" wait (see use-cooldown). */
export function testCooldownKey(webhookId: string): string {
  return `test:${webhookId}`;
}

/**
 * Queues a test ping and says so in a toast. Returns whether it was queued. Starts the 10-second wait before the
 * next test; a 429 (tested too soon, or too many tests and retries this minute) starts the wait the API asked for.
 */
export async function sendTestPing(webhook: Webhook): Promise<boolean> {
  try {
    await webhooksApi.sendTest(webhook.id);
    startCooldown(testCooldownKey(webhook.id), TEST_COOLDOWN_SECONDS);
    toast({
      tone: "success",
      title: "Test sent",
      description: `A test message should reach ${hostOf(webhook.url)} within a few seconds.`,
    });
    return true;
  } catch (error) {
    if (isApiError(error) && error.code === "TOO_MANY_REQUESTS") {
      startCooldown(testCooldownKey(webhook.id), error.retryAfterSeconds ?? TEST_COOLDOWN_SECONDS);
      toast({ tone: "error", title: "Please wait a moment", description: retryMessage(error) });
      return false;
    }
    toast({ tone: "error", title: "We couldn't send the test", description: errorMessage(error) });
    return false;
  }
}

/**
 * Turns a webhook back on and says so in a toast. Returns the updated webhook, or null when the backend refused
 * (e.g. 409 WEBHOOK_LIMIT_REACHED or WEBHOOK_URL_IN_USE; its message is shown). On 409 WEBHOOK_CHANGED `onStale`
 * runs, so the caller loads the webhooks again.
 */
export async function turnOnWebhook(webhook: Webhook, onStale?: () => void): Promise<Webhook | null> {
  try {
    const updated = await webhooksApi.update(webhook.id, { active: true });
    toast({
      tone: "success",
      title: "Webhook turned on",
      description: `New events go to ${hostOf(webhook.url)} again.`,
    });
    return updated;
  } catch (error) {
    toast({ tone: "error", title: "We couldn't turn it on", description: errorMessage(error) });
    if (isWebhookChanged(error)) onStale?.();
    return null;
  }
}

/**
 * The ⋯ menu of one webhook and the dialogs behind it. Every change is passed up with `onChange`;
 * `onTestSent` runs after a test ping was queued (the detail page reloads its history). `existing` (the merchant's
 * other webhooks) lets the edit dialog warn about an address that's already in use. `onStale` runs when the backend
 * says someone else changed this webhook at the same moment (409 WEBHOOK_CHANGED), so the page loads the latest.
 */
export function WebhookActions({
  webhook,
  onChange,
  onTestSent,
  onStale,
  existing,
  deliveriesHref,
}: {
  webhook: Webhook;
  onChange: (webhook: Webhook) => void;
  onTestSent?: () => void;
  onStale?: () => void;
  existing?: readonly Webhook[];
  /** The webhook's own page (delivery history, search, setup guide); left out on that page itself. */
  deliveriesHref?: string;
}) {
  const [dialog, setDialog] = React.useState<OpenDialog>(null);
  const [secret, setSecret] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const testWait = useCooldown(testCooldownKey(webhook.id));
  const host = hostOf(webhook.url);

  function closeDialog() {
    setDialog(null);
    setNotice(null);
  }

  async function sendTest() {
    if (await sendTestPing(webhook)) onTestSent?.();
  }

  async function turnOn() {
    const updated = await turnOnWebhook(webhook, onStale);
    if (updated) onChange(updated);
  }

  async function confirmTurnOff() {
    setBusy(true);
    setNotice(null);
    try {
      await webhooksApi.turnOff(webhook.id);
      onChange({ ...webhook, active: false });
      closeDialog();
      toast({ tone: "success", title: "Webhook turned off" });
    } catch (error) {
      setNotice(errorMessage(error));
      if (isWebhookChanged(error)) onStale?.();
    } finally {
      setBusy(false);
    }
  }

  async function confirmRotate() {
    setBusy(true);
    setNotice(null);
    try {
      const rotated = await webhooksApi.rotateSecret(webhook.id);
      const { secret: newSecret, ...rest } = rotated;
      onChange(rest);
      closeDialog();
      setSecret(newSecret);
    } catch (error) {
      // WEBHOOK_CHANGED: another rotation won the race; its secret is the one stored, and none is shown here
      setNotice(errorMessage(error));
      if (isWebhookChanged(error)) onStale?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label={`Actions for ${host}`} variant="tertiary">
            <MoreHorizontal />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {deliveriesHref ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={deliveriesHref}>
                  <History aria-hidden="true" />
                  View deliveries
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onSelect={sendTest} disabled={testWait > 0}>
            <Send />
            {testWait > 0 ? `Send test (${testWait} s)` : "Send test"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("edit")}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("rotate")}>
            <RefreshCw />
            Rotate secret
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {webhook.active ? (
            <DropdownMenuItem onSelect={() => setDialog("turnOff")}>
              <PowerOff />
              Turn off
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={turnOn}>
              <Power />
              Turn on
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <WebhookFormDialog
        open={dialog === "edit"}
        onOpenChange={(open) => (open ? setDialog("edit") : closeDialog())}
        webhook={webhook}
        existing={existing}
        onStale={onStale}
        onUpdated={(updated) => {
          onChange(updated);
          toast({ tone: "success", title: "Webhook saved" });
        }}
      />

      <AlertDialog open={dialog === "rotate"} onOpenChange={(open) => (open ? setDialog("rotate") : closeDialog())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the signing secret?</AlertDialogTitle>
            <AlertDialogDescription>
              The current secret stops working immediately, also for deliveries being retried. Update your server
              with the new secret right after.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {notice ? (
            <InlineNotice tone="error" title="We couldn't rotate the secret">
              {notice}
            </InlineNotice>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" disabled={busy}>
                Keep current secret
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="danger"
                loading={busy}
                onClick={(event) => {
                  event.preventDefault();
                  void confirmRotate();
                }}
              >
                Rotate secret
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "turnOff"} onOpenChange={(open) => (open ? setDialog("turnOff") : closeDialog())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off this webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              {host} stops receiving parcel events, and deliveries still waiting won&apos;t be sent. You can turn
              it on again later; its history is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {notice ? (
            <InlineNotice tone="error" title="We couldn't turn it off">
              {notice}
            </InlineNotice>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" disabled={busy}>
                Keep it on
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="danger"
                loading={busy}
                onClick={(event) => {
                  event.preventDefault();
                  void confirmTurnOff();
                }}
              >
                Turn off
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SecretDialog secret={secret} reason="rotated" onClose={() => setSecret(null)} />
    </>
  );
}
