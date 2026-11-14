"use client";

import Link from "next/link";
import { Copy, Network, Plus, RotateCw, ShieldCheck, Timer, Webhook as WebhookIcon } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/identity";
import { formatDate } from "@/lib/format";
import { useWebhooks } from "../hooks/use-webhooks";
import { MAX_ACTIVE_WEBHOOKS } from "../labels";
import { webhookHref } from "../routes";
import type { Webhook, WebhookEventType, WebhookWithSecret } from "../types";
import { ActiveBadge } from "./active-badge";
import { EventChips } from "./event-chips";
import { SecretDialog } from "./secret-dialog";
import { WebhookActions, turnOnWebhook } from "./webhook-actions";
import { WebhookFormDialog } from "./webhook-form-dialog";

const COLUMNS = 5;

/**
 * /merchant/webhooks: the merchant's webhook endpoints, with add, edit, test, rotate secret and turn off/on.
 * At most 5 can be active; only approved merchants can add one.
 */
export function WebhookList() {
  const user = useCurrentUser();
  const webhooks = useWebhooks();
  const [adding, setAdding] = React.useState(false);
  const [created, setCreated] = React.useState<string | null>(null);
  const [notApproved, setNotApproved] = React.useState(false);
  /** "Edit that webhook" from the Add dialog: which webhook, with which events to start from. */
  const [editRequest, setEditRequest] = React.useState<{ webhook: Webhook; eventTypes: WebhookEventType[] } | null>(
    null,
  );

  const approval = user?.merchant?.approvalStatus;
  const approved = approval === "APPROVED" && !notApproved;
  const list = webhooks.status === "ready" ? webhooks.webhooks : [];
  const activeCount = list.filter((webhook) => webhook.active).length;
  const atLimit = activeCount >= MAX_ACTIVE_WEBHOOKS;
  const canAdd = approved && webhooks.status === "ready" && !atLimit;

  function onCreated(webhook: WebhookWithSecret) {
    const { secret, ...rest } = webhook;
    webhooks.upsert(rest);
    setCreated(secret);
  }

  /**
   * The Add dialog found a webhook with the same address: switch to editing that one, with the chosen events merged
   * in. A turned-off one is turned on first; if that's refused (limit of 5), the Add dialog stays open.
   */
  async function switchToExistingWebhook(match: Webhook, eventTypes: WebhookEventType[]): Promise<boolean> {
    let target = match;
    if (!match.active) {
      const updated = await turnOnWebhook(match);
      if (!updated) return false;
      webhooks.upsert(updated);
      target = updated;
    }
    setAdding(false);
    setEditRequest({ webhook: target, eventTypes });
    return true;
  }

  const addButton = (
    <Button onClick={() => setAdding(true)} disabled={!canAdd}>
      <Plus aria-hidden="true" />
      Add webhook
    </Button>
  );

  return (
    <ListPage
      title="Webhooks"
      description="Get a message on your server whenever one of your orders changes status."
      action={addButton}
    >
      {!approved && user ? (
        <InlineNotice title="Your account is waiting for approval">
          {approval === "REJECTED"
            ? "Your merchant application wasn't approved, so you can't add webhooks. Contact us if you think this is a mistake."
            : "You can add webhooks once a SwiftDrop admin has approved your business."}
        </InlineNotice>
      ) : null}

      <Card aria-labelledby="webhooks-heading">
        <CardHeader
          title="Endpoints"
          titleId="webhooks-heading"
          description={
            webhooks.status === "ready" ? (
              <span className="tabular-nums">
                {activeCount} of {MAX_ACTIVE_WEBHOOKS} active
                {atLimit ? " · add events to an existing webhook, or turn one off" : null}
              </span>
            ) : undefined
          }
          aside={webhooks.status === "ready" ? <ActiveMeter active={activeCount} /> : undefined}
        />

        {webhooks.status === "error" ? (
          <div className="p-4 sm:p-6">
            <InlineNotice tone="error" title="We couldn't load your webhooks">
              <p>{webhooks.error}</p>
              <Button variant="secondary" className="mt-3" onClick={webhooks.reload}>
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
            </InlineNotice>
          </div>
        ) : (
          <>
            {/* Phones: one card per webhook. */}
            <ul className="divide-y divide-grey-100 md:hidden" aria-busy={webhooks.status === "loading"}>
              {webhooks.status === "loading" ? (
                <li className="p-4 text-body-sm text-grey-600">Loading webhooks…</li>
              ) : null}
              {webhooks.status === "ready" && list.length === 0 ? (
                <li className="p-4">
                  <EmptyHint approved={approved} onAdd={() => setAdding(true)} />
                </li>
              ) : null}
              {list.map((webhook) => (
                <li key={webhook.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <EndpointCell url={webhook.url} href={webhookHref(webhook.id)} />
                    <WebhookActions webhook={webhook} onChange={webhooks.upsert} existing={list} />
                  </div>
                  <EventChips eventTypes={webhook.eventTypes} />
                  <div className="flex items-center justify-between gap-3">
                    <ActiveBadge active={webhook.active} />
                    <span className="text-caption text-grey-600 tabular-nums">
                      Added {formatDate(webhook.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablets and up: a table. */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.status === "loading" ? (
                    <TableLoading columns={COLUMNS} rows={3} label="Loading webhooks" />
                  ) : list.length === 0 ? (
                    <TableEmpty
                      columns={COLUMNS}
                      icon={WebhookIcon}
                      title="No webhooks yet"
                      description="Add your server's address and choose the events you want. We'll send a signed request each time one happens."
                      action={approved ? <Button onClick={() => setAdding(true)}>Add webhook</Button> : undefined}
                    />
                  ) : (
                    list.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="max-w-sm">
                          <EndpointCell url={webhook.url} href={webhookHref(webhook.id)} />
                        </TableCell>
                        <TableCell>
                          <EventChips eventTypes={webhook.eventTypes} />
                        </TableCell>
                        <TableCell>
                          <ActiveBadge active={webhook.active} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatDate(webhook.createdAt)}</TableCell>
                        <TableCell className="w-12 text-right">
                          <WebhookActions webhook={webhook} onChange={webhooks.upsert} existing={list} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <HowItWorks />

      <WebhookFormDialog
        open={adding}
        onOpenChange={setAdding}
        existing={list}
        onCreated={onCreated}
        onNotApproved={() => setNotApproved(true)}
        onUseExisting={switchToExistingWebhook}
      />
      {editRequest ? (
        <WebhookFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditRequest(null);
          }}
          webhook={editRequest.webhook}
          initialEventTypes={editRequest.eventTypes}
          existing={list}
          onUpdated={(updated) => {
            webhooks.upsert(updated);
            toast({ tone: "success", title: "Webhook saved" });
          }}
        />
      ) : null}
      <SecretDialog secret={created} reason="created" onClose={() => setCreated(null)} />
    </ListPage>
  );
}

/* ---------------------------------------------------------------- Pieces */

/** The host (a link to the webhook's page), the path below it, and a copy button. Long URLs are truncated. */
function EndpointCell({ url, href }: { url: string; href: string }) {
  const { host, rest } = splitUrl(url);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ tone: "success", title: "Address copied" });
    } catch {
      toast({ tone: "error", title: "We couldn't copy it", description: "Select the address and copy it yourself." });
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 flex-col">
        <Link
          href={href}
          className="truncate text-label font-medium text-grey-900 hover:text-orange-700 hover:underline"
          title={url}
        >
          {host}
        </Link>
        {rest ? (
          <span className="truncate text-caption text-grey-600" title={url}>
            {rest}
          </span>
        ) : null}
      </div>
      <IconButton label="Copy address" variant="tertiary" onClick={copy}>
        <Copy />
      </IconButton>
    </div>
  );
}

function splitUrl(url: string): { host: string; rest: string } {
  try {
    const parsed = new URL(url);
    const rest = `${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}`;
    return { host: parsed.host, rest };
  } catch {
    return { host: url, rest: "" };
  }
}

/** Five small bars, one per allowed active webhook. Grey only: it's a count, not a status. */
function ActiveMeter({ active }: { active: number }) {
  return (
    <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
      {Array.from({ length: MAX_ACTIVE_WEBHOOKS }, (_, index) => (
        <span
          key={index}
          className={index < active ? "h-2 w-5 rounded-sm bg-grey-700" : "h-2 w-5 rounded-sm bg-grey-200"}
        />
      ))}
    </div>
  );
}

function EmptyHint({ approved, onAdd }: { approved: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-label text-grey-900">No webhooks yet</span>
        <span className="text-body-sm text-grey-600">
          Add your server&apos;s address and choose the events you want.
        </span>
      </div>
      {approved ? (
        <Button variant="secondary" onClick={onAdd}>
          <Plus aria-hidden="true" />
          Add webhook
        </Button>
      ) : null}
    </div>
  );
}

/** Four facts every integrator needs before writing their endpoint. */
function HowItWorks() {
  const facts = [
    {
      icon: Network,
      title: "One webhook per destination",
      text: "Choose every event that server needs. Add another webhook only for a different system, like billing.",
    },
    {
      icon: ShieldCheck,
      title: "Every request is signed",
      text: "Check the X-SwiftDrop-Signature header with your secret before you trust a request.",
    },
    {
      icon: Timer,
      title: "Answer within 10 seconds",
      text: "Any 2xx answer counts as delivered. Do slow work after you've answered.",
    },
    {
      icon: RotateCw,
      title: "Failed requests are retried",
      text: "Right away, then after 1 min, 5 min, 15 min, 1 h and 6 h. The same event can arrive twice: use its id.",
    },
  ];

  return (
    <Card aria-labelledby="webhooks-how-heading">
      <CardHeader title="How webhooks work" titleId="webhooks-how-heading" />
      <CardContent>
        <ul className="grid gap-6 md:grid-cols-2">
          {facts.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-grey-200 bg-grey-50 text-grey-700">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label text-grey-900">{title}</span>
                <span className="text-body-sm text-grey-600">{text}</span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
