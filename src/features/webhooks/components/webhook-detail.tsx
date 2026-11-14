"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, RotateCw, Send } from "lucide-react";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import { useWebhooks } from "../hooks/use-webhooks";
import { WEBHOOK_EVENT_LABEL } from "../labels";
import { WEBHOOKS_HREF } from "../routes";
import type { Webhook } from "../types";
import { ActiveBadge } from "./active-badge";
import { DeliveryHistory } from "./delivery-history";
import { SetupGuide } from "./setup-guide";
import { WebhookActions, hostOf, sendTestPing } from "./webhook-actions";

/**
 * /merchant/webhooks/[id]: one webhook with its delivery history (filter, retry, live refresh while something is
 * about to be sent) and the setup guide. There is no "get one" endpoint, so it is found in the merchant's list
 * (at most a handful); another merchant's id or an unknown one shows "not found".
 */
export function WebhookDetail({ id: idProp }: { id?: string }) {
  const params = useParams<{ id?: string }>();
  const id = idProp ?? params.id ?? "";
  const webhooks = useWebhooks();
  const [refreshSignal, setRefreshSignal] = React.useState(0);
  const [sending, setSending] = React.useState(false);

  const refreshHistory = React.useCallback(() => setRefreshSignal((value) => value + 1), []);

  if (webhooks.status === "loading") {
    return <DetailSkeleton />;
  }

  if (webhooks.status === "error") {
    return (
      <DetailPage title="Webhook" backHref={WEBHOOKS_HREF} backLabel="Webhooks">
        <InlineNotice tone="error" title="We couldn't load this webhook">
          <p>{webhooks.error}</p>
          <Button variant="secondary" className="mt-3" onClick={webhooks.reload}>
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        </InlineNotice>
      </DetailPage>
    );
  }

  const webhook = webhooks.webhooks.find((item) => item.id === id);
  if (!webhook) {
    return (
      <DetailPage title="Webhook not found" backHref={WEBHOOKS_HREF} backLabel="Webhooks">
        <InlineNotice title="This webhook doesn't exist or isn't yours">
          <p>Check the link, or open it from your list of webhooks.</p>
          <Button asChild variant="secondary" className="mt-3">
            <Link href={WEBHOOKS_HREF}>Go to webhooks</Link>
          </Button>
        </InlineNotice>
      </DetailPage>
    );
  }

  async function sendTest(target: Webhook) {
    setSending(true);
    try {
      if (await sendTestPing(target)) refreshHistory();
    } finally {
      setSending(false);
    }
  }

  return (
    <DetailPage
      title={hostOf(webhook.url)}
      description={<span className="break-all">{webhook.url}</span>}
      backHref={WEBHOOKS_HREF}
      backLabel="Webhooks"
      status={<ActiveBadge active={webhook.active} />}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => sendTest(webhook)} loading={sending}>
            <Send aria-hidden="true" />
            Send test
          </Button>
          <WebhookActions webhook={webhook} onChange={webhooks.upsert} onTestSent={refreshHistory} />
        </div>
      }
      aside={<WebhookSummary webhook={webhook} />}
    >
      {!webhook.active ? (
        <InlineNotice title="This webhook is turned off">
          It gets no new parcel events, and deliveries still waiting aren&apos;t sent. A test ping is still sent, so
          you can check the address before you turn it on again.
        </InlineNotice>
      ) : null}
      <Tabs defaultValue="deliveries">
        <TabsList aria-label="Webhook sections">
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="guide">Setup guide</TabsTrigger>
        </TabsList>
        <TabsContent value="deliveries">
          <DeliveryHistory webhookId={webhook.id} refreshSignal={refreshSignal} />
        </TabsContent>
        <TabsContent value="guide">
          <SetupGuide />
        </TabsContent>
      </Tabs>
    </DetailPage>
  );
}

/** Side column: the full address, every event, and dates. */
function WebhookSummary({ webhook }: { webhook: Webhook }) {
  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({ tone: "success", title: `${what} copied` });
    } catch {
      toast({ tone: "error", title: "We couldn't copy it", description: "Select the text and copy it yourself." });
    }
  }

  return (
    <Card aria-labelledby="webhook-summary-heading">
      <CardHeader title="Details" titleId="webhook-summary-heading" />
      <CardContent>
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-grey-600">Endpoint</dt>
            <dd className="flex items-start justify-between gap-2">
              <span className="min-w-0 text-body-sm break-all text-grey-900">{webhook.url}</span>
              <Button type="button" variant="link" onClick={() => copy(webhook.url, "Address")}>
                <Copy aria-hidden="true" />
                Copy
              </Button>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-grey-600">Events ({webhook.eventTypes.length})</dt>
            <dd>
              <ul className="flex flex-col gap-1 text-body-sm text-grey-900">
                {webhook.eventTypes.map((type) => (
                  <li key={type}>{WEBHOOK_EVENT_LABEL[type]}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-grey-600">Added</dt>
            <dd className="text-body-sm text-grey-900 tabular-nums">{formatDateTime(webhook.createdAt)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-grey-600">Last changed</dt>
            <dd className="text-body-sm text-grey-900 tabular-nums">{formatDateTime(webhook.updatedAt)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-caption text-grey-600">Webhook ID</dt>
            <dd className="font-mono text-caption break-all text-grey-700">{webhook.id}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading webhook">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card className="p-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Card>
    </div>
  );
}
