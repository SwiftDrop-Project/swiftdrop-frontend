"use client";

import { RotateCw, Webhook as WebhookIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { adminWebhooksApi, webhooksApi } from "../api";
import { type DeliveryLoader, useDeliveries } from "../hooks/use-deliveries";
import { NO_DELIVERY_FILTERS } from "../hooks/use-delivery-filters";
import { useWebhooks } from "../hooks/use-webhooks";
import { type DeliveryAudience, deliveryEventLabel, lastResult, timeUntil } from "../labels";
import { webhookHref } from "../routes";
import type { WebhookDelivery } from "../types";
import { DeliveryStatusBadge, RetryButton, attemptsText } from "./delivery-parts";
import { hostOf } from "./webhook-actions";

type Props =
  | { scope: "merchant"; parcelId: string; merchantId?: undefined }
  | { scope: "admin"; parcelId: string; merchantId: string };

/** The admin's Webhook Logs, filtered to one merchant. */
export function adminWebhookLogsHref(merchantId: string): string {
  return `/admin/webhooks?merchantId=${encodeURIComponent(merchantId)}`;
}

/**
 * Every webhook message SwiftDrop sent about one parcel, newest first, from all of the merchant's webhooks: the
 * event, where it went (merchants see the webhook's address), its status and last result, and Retry on failed ones.
 * Merchants load GET /merchant/webhooks/deliveries?search=<parcel id>; admins GET /admin/webhooks/deliveries with
 * the parcel's merchant. Refreshes by itself while a message is about to be sent.
 */
export function ParcelWebhookMessages(props: Props) {
  const { scope, parcelId } = props;
  const merchantId = props.scope === "admin" ? props.merchantId : undefined;
  const audience: DeliveryAudience = scope;
  const [page, setPage] = React.useState(0);

  const load = React.useCallback<DeliveryLoader<WebhookDelivery>>(
    (query, signal) =>
      scope === "admin"
        ? adminWebhooksApi.deliveries({ ...query, merchantId, search: parcelId }, signal)
        : webhooksApi.allDeliveries({ ...query, search: parcelId }, signal),
    [scope, merchantId, parcelId],
  );
  const deliveries = useDeliveries(`parcel:${scope}:${merchantId ?? ""}:${parcelId}`, load, NO_DELIVERY_FILTERS, page);
  const { reload } = deliveries;
  const retry = scope === "admin" ? adminWebhooksApi.retry : webhooksApi.retry;

  return (
    <Card aria-labelledby={`parcel-webhooks-${parcelId}`}>
      <CardHeader
        title="Webhook messages"
        titleId={`parcel-webhooks-${parcelId}`}
        description={
          scope === "admin"
            ? "What SwiftDrop sent about this parcel to the merchant's webhooks."
            : "What SwiftDrop sent about this order to your webhooks."
        }
      />

      {deliveries.status === "loading" ? (
        <CardContent className="flex flex-col gap-3" aria-busy="true" aria-label="Loading webhook messages">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      ) : deliveries.status === "error" ? (
        <CardContent>
          <InlineNotice tone="error" title="We couldn't load the webhook messages">
            <p>{deliveries.error}</p>
            <Button variant="secondary" className="mt-3" onClick={reload}>
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
          </InlineNotice>
        </CardContent>
      ) : deliveries.data.content.length === 0 ? (
        <CardContent className="flex flex-col items-start gap-1">
          <span className="text-label text-grey-900">No webhook messages for this parcel</span>
          <span className="text-body-sm text-grey-600">
            {scope === "admin"
              ? "Messages are sent only to the merchant's webhooks that are on and chose the event."
              : "Messages are sent only to your webhooks that are on and chose the event."}
          </span>
        </CardContent>
      ) : (
        <>
          {audience === "merchant" ? (
            <MerchantMessageList items={deliveries.data.content} onRetry={retry} onRetried={reload} />
          ) : (
            <MessageList
              items={deliveries.data.content}
              audience="admin"
              destinationOf={noDestination}
              onRetry={retry}
              onRetried={reload}
            />
          )}
          {deliveries.data.totalPages > 1 ? (
            <div className="border-t border-grey-200 p-4">
              <Pagination
                page={deliveries.data.page}
                totalPages={deliveries.data.totalPages}
                totalElements={deliveries.data.totalElements}
                size={deliveries.data.size}
                onPageChange={setPage}
                itemLabel="messages"
              />
            </div>
          ) : null}
        </>
      )}

      {scope === "admin" && merchantId ? (
        <CardContent className="border-t border-grey-200">
          <Link
            href={adminWebhookLogsHref(merchantId)}
            className="text-body-sm text-orange-700 hover:text-orange-800 hover:underline"
          >
            See all of this merchant&apos;s webhook messages
          </Link>
        </CardContent>
      ) : null}
    </Card>
  );
}

interface ListProps {
  items: WebhookDelivery[];
  onRetry: (deliveryId: string) => Promise<unknown>;
  onRetried: () => void;
}

/**
 * Merchants also see where each message went: the host of the webhook ("shop.example.com"), linking to its page.
 * The admin list has no addresses, so admins' rows show no destination.
 */
function MerchantMessageList(props: ListProps) {
  const webhooks = useWebhooks();
  const hosts = React.useMemo(
    () => new Map(webhooks.status === "ready" ? webhooks.webhooks.map((item) => [item.id, hostOf(item.url)]) : []),
    [webhooks.status, webhooks.webhooks],
  );
  const destinationOf = React.useCallback((subscriptionId: string) => hosts.get(subscriptionId) ?? null, [hosts]);
  return <MessageList {...props} audience="merchant" destinationOf={destinationOf} />;
}

function noDestination(): string | null {
  return null;
}

/** One row per message. Narrow on purpose: it also sits in the order side panel. */
function MessageList({
  items,
  audience,
  destinationOf,
  onRetry,
  onRetried,
}: ListProps & {
  audience: DeliveryAudience;
  destinationOf: (subscriptionId: string) => string | null;
}) {
  const destination = destinationOf;

  return (
    <ul className="divide-y divide-grey-100 border-t border-grey-200">
      {items.map((delivery) => {
        const next =
          delivery.status === "PENDING" && delivery.nextAttemptAt ? timeUntil(delivery.nextAttemptAt) : null;
        const to = destination(delivery.subscriptionId);
        return (
          <li key={delivery.id} className="flex flex-col gap-2 px-4 py-3 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-label text-grey-900">{deliveryEventLabel(delivery.eventType)}</span>
                {to ? (
                  <Link
                    href={webhookHref(delivery.subscriptionId)}
                    className="flex items-center gap-1 truncate text-body-sm text-grey-600 hover:text-grey-900 hover:underline"
                  >
                    <WebhookIcon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">To {to}</span>
                  </Link>
                ) : null}
              </div>
              <DeliveryStatusBadge status={delivery.status} />
            </div>
            <span className="text-body-sm text-grey-900">
              {lastResult(delivery, audience)}
              {audience === "admin" && delivery.lastError ? (
                <span className="ml-2 font-mono text-caption text-grey-600">{delivery.lastError}</span>
              ) : null}
            </span>
            <span className="text-caption text-grey-600 tabular-nums">
              {attemptsText(delivery)} · {formatDateTime(delivery.createdAt)}
              {next ? ` · next attempt ${next}` : null}
            </span>
            {delivery.status === "FAILED" ? (
              <div>
                <RetryButton deliveryId={delivery.id} onRetry={onRetry} onRetried={onRetried} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

