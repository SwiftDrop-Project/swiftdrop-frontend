"use client";

import { History, RotateCw } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
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
import { isApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { webhooksApi } from "../api";
import { useDeliveries } from "../hooks/use-deliveries";
import {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_TONE,
  MAX_ATTEMPTS,
  deliveryEventLabel,
  lastResult,
  timeUntil,
} from "../labels";
import type { DeliveryStatus, WebhookDelivery } from "../types";

const COLUMNS = 6;
const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

/**
 * The delivery history of one webhook, newest first: status filter, pages of 20, Retry on failed deliveries.
 * `refreshSignal` changes when the parent queued something (e.g. "Send test"), so the list loads again.
 */
export function DeliveryHistory({ webhookId, refreshSignal }: { webhookId: string; refreshSignal: number }) {
  const [status, setStatus] = React.useState<DeliveryStatus | "">("");
  const [page, setPage] = React.useState(0);
  const deliveries = useDeliveries(webhookId, status, page);
  const { reload } = deliveries;

  React.useEffect(() => {
    if (refreshSignal > 0) reload();
  }, [refreshSignal, reload]);

  const content = deliveries.status === "ready" ? deliveries.data.content : [];
  const filtered = status !== "";

  return (
    <Card aria-labelledby="deliveries-heading">
      <CardHeader
        title="Deliveries"
        titleId="deliveries-heading"
        description={
          deliveries.status === "ready"
            ? `${deliveries.data.totalElements} ${deliveries.data.totalElements === 1 ? "delivery" : "deliveries"}`
            : undefined
        }
        aside={
          <div className="w-36 sm:w-44">
            <label htmlFor="deliveries-status" className="sr-only">
              Status
            </label>
            <Select
              id="deliveries-status"
              size="md"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as DeliveryStatus | "");
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {DELIVERY_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {DELIVERY_STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {deliveries.status === "error" ? (
        <div className="p-4 sm:p-6">
          <InlineNotice tone="error" title="We couldn't load the deliveries">
            <p>{deliveries.error}</p>
            <Button variant="secondary" className="mt-3" onClick={reload}>
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
          </InlineNotice>
        </div>
      ) : (
        <>
          {/* Phones: one card per delivery. */}
          <ul className="divide-y divide-grey-100 md:hidden" aria-busy={deliveries.status === "loading"}>
            {deliveries.status === "loading" ? (
              <li className="p-4 text-body-sm text-grey-600">Loading deliveries…</li>
            ) : null}
            {deliveries.status === "ready" && content.length === 0 ? (
              <li className="p-4 text-body-sm text-grey-600">{emptyText(filtered)}</li>
            ) : null}
            {content.map((delivery) => (
              <li key={delivery.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <EventCell delivery={delivery} />
                  <DeliveryStatusBadge status={delivery.status} />
                </div>
                <span className="text-body-sm text-grey-900">{lastResult(delivery)}</span>
                <span className="text-caption text-grey-600 tabular-nums">
                  {attemptsText(delivery)} · {formatDateTime(delivery.createdAt)}
                  {nextAttemptText(delivery) ? ` · next attempt ${nextAttemptText(delivery)}` : null}
                </span>
                {delivery.status === "FAILED" ? <RetryButton delivery={delivery} onRetried={reload} /> : null}
              </li>
            ))}
          </ul>

          {/* Tablets and up: a table. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last result</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.status === "loading" ? (
                  <TableLoading columns={COLUMNS} rows={4} label="Loading deliveries" />
                ) : content.length === 0 ? (
                  <TableEmpty
                    columns={COLUMNS}
                    icon={History}
                    title={filtered ? "No deliveries match this status" : "No deliveries yet"}
                    description={emptyText(filtered)}
                  />
                ) : (
                  content.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <EventCell delivery={delivery} />
                      </TableCell>
                      <TableCell>
                        <DeliveryStatusBadge status={delivery.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{attemptsText(delivery)}</TableCell>
                      <TableCell>
                        {lastResult(delivery)}
                        {nextAttemptText(delivery) ? (
                          <span className="block text-caption text-grey-600">
                            Next attempt {nextAttemptText(delivery)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDateTime(delivery.createdAt)}
                        {delivery.deliveredAt ? (
                          <span className="block text-caption text-grey-600">
                            Delivered {formatDateTime(delivery.deliveredAt)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {delivery.status === "FAILED" ? <RetryButton delivery={delivery} onRetried={reload} /> : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {deliveries.status === "ready" && deliveries.data.totalPages > 1 ? (
            <div className="border-t border-grey-200 p-4">
              <Pagination
                page={deliveries.data.page}
                totalPages={deliveries.data.totalPages}
                totalElements={deliveries.data.totalElements}
                size={deliveries.data.size}
                onPageChange={setPage}
                itemLabel="deliveries"
              />
            </div>
          ) : null}
        </>
      )}

      <CardContent className="border-t border-grey-200">
        <p className="text-body-sm text-grey-600">
          Failed requests are retried right away, then after 1 min, 5 min, 15 min, 1 h and 6 h. After{" "}
          {MAX_ATTEMPTS} attempts, or a 4xx answer other than 408 and 429, the delivery is marked Failed and you can
          retry it here. A test ping is retried the same way.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- Pieces */

function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <Badge tone={DELIVERY_STATUS_TONE[status]}>{DELIVERY_STATUS_LABEL[status]}</Badge>;
}

/** "Delivered" and the event id, which the merchant can search for in their own logs. */
function EventCell({ delivery }: { delivery: WebhookDelivery }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-label text-grey-900">{deliveryEventLabel(delivery.eventType)}</span>
      <span className="truncate font-mono text-caption text-grey-600" title={delivery.eventId}>
        {delivery.eventId}
      </span>
    </div>
  );
}

function RetryButton({ delivery, onRetried }: { delivery: WebhookDelivery; onRetried: () => void }) {
  const [busy, setBusy] = React.useState(false);

  async function retry() {
    setBusy(true);
    try {
      await webhooksApi.retry(delivery.id);
      toast({ tone: "success", title: "Delivery queued again", description: "It will be sent within a few seconds." });
    } catch (error) {
      toast({
        tone: "error",
        title: "We couldn't retry it",
        description: isApiError(error) ? error.message : UNKNOWN_ERROR,
      });
    } finally {
      setBusy(false);
      onRetried(); // in both cases the row may have changed (409: it isn't FAILED any more)
    }
  }

  return (
    <Button variant="secondary" onClick={retry} loading={busy}>
      <RotateCw aria-hidden="true" />
      Retry
    </Button>
  );
}

function attemptsText(delivery: WebhookDelivery): string {
  return `${delivery.attempts} of ${MAX_ATTEMPTS}`;
}

function nextAttemptText(delivery: WebhookDelivery): string | null {
  return delivery.status === "PENDING" && delivery.nextAttemptAt ? timeUntil(delivery.nextAttemptAt) : null;
}

function emptyText(filtered: boolean): string {
  return filtered
    ? "Choose another status to see more deliveries."
    : "Send a test to check your endpoint. Parcel events appear here as your orders move.";
}
