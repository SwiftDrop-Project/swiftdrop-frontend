"use client";

import { History, RotateCw } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Pagination } from "@/components/ui/pagination";
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
import { formatDateTime, formatTrackingNumber } from "@/lib/format";
import type { DeliveriesState } from "../hooks/use-deliveries";
import {
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_TONE,
  MAX_ATTEMPTS,
  type DeliveryAudience,
  deliveryEventLabel,
  lastResult,
  timeUntil,
} from "../labels";
import type { DeliveryFilterValues, DeliveryStatus, WebhookDelivery } from "../types";

/* Pieces shared by the merchant's delivery history and the admin's Webhook Logs. */

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

/** A column added before the others, e.g. the merchant on the admin list. */
export interface LeadingColumn<T> {
  header: string;
  cell: (delivery: T) => React.ReactNode;
}

/**
 * A page of deliveries: an error notice with "Try again", or one card per delivery on phones and a table from
 * tablets up, then pagination. Failed deliveries get a Retry button that calls `onRetry`.
 */
export function DeliveryList<T extends WebhookDelivery>({
  deliveries,
  audience,
  leading,
  emptyTitle,
  emptyText,
  clearButton,
  onRetry,
  onPageChange,
}: {
  deliveries: DeliveriesState<T> & { reload: () => void };
  audience: DeliveryAudience;
  leading?: LeadingColumn<T>;
  emptyTitle: string;
  emptyText: string;
  /** Shown in the empty and error states while a filter is set. */
  clearButton?: React.ReactNode;
  onRetry: (deliveryId: string) => Promise<unknown>;
  onPageChange: (page: number) => void;
}) {
  const { reload } = deliveries;
  const columns = leading ? 7 : 6;
  const content = deliveries.status === "ready" ? deliveries.data.content : [];

  if (deliveries.status === "error") {
    return (
      <div className="p-4 sm:p-6">
        <InlineNotice tone="error" title="We couldn't load the deliveries">
          <p>{deliveries.error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={reload}>
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
            {clearButton}
          </div>
        </InlineNotice>
      </div>
    );
  }

  return (
    <>
      {/* Phones: one card per delivery. */}
      <ul className="divide-y divide-grey-100 md:hidden" aria-busy={deliveries.status === "loading"}>
        {deliveries.status === "loading" ? (
          <li className="p-4 text-body-sm text-grey-600">Loading deliveries…</li>
        ) : null}
        {deliveries.status === "ready" && content.length === 0 ? (
          <li className="flex flex-col items-start gap-1 p-4">
            <span className="text-label text-grey-900">{emptyTitle}</span>
            <span className="text-body-sm text-grey-600">{emptyText}</span>
            {clearButton ? <div className="mt-2">{clearButton}</div> : null}
          </li>
        ) : null}
        {content.map((delivery) => (
          <li key={delivery.id} className="flex flex-col gap-2 p-4">
            {leading ? <span className="text-label text-grey-900">{leading.cell(delivery)}</span> : null}
            <div className="flex items-start justify-between gap-3">
              <EventCell delivery={delivery} />
              <DeliveryStatusBadge status={delivery.status} />
            </div>
            <LastResult delivery={delivery} audience={audience} />
            <span className="text-caption text-grey-600 tabular-nums">
              {attemptsText(delivery)} · {formatDateTime(delivery.createdAt)}
            </span>
            {delivery.status === "FAILED" ? (
              <RetryButton deliveryId={delivery.id} onRetry={onRetry} onRetried={reload} />
            ) : null}
          </li>
        ))}
      </ul>

      {/* Tablets and up: a table. */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {leading ? <TableHead>{leading.header}</TableHead> : null}
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
              <TableLoading columns={columns} rows={4} label="Loading deliveries" />
            ) : content.length === 0 ? (
              <TableEmpty
                columns={columns}
                icon={History}
                title={emptyTitle}
                description={emptyText}
                action={clearButton || undefined}
              />
            ) : (
              content.map((delivery) => (
                <TableRow key={delivery.id}>
                  {leading ? <TableCell>{leading.cell(delivery)}</TableCell> : null}
                  <TableCell>
                    <EventCell delivery={delivery} />
                  </TableCell>
                  <TableCell>
                    <DeliveryStatusBadge status={delivery.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{attemptsText(delivery)}</TableCell>
                  <TableCell>
                    <LastResult delivery={delivery} audience={audience} />
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
                    {delivery.status === "FAILED" ? (
                      <RetryButton deliveryId={delivery.id} onRetry={onRetry} onRetried={reload} />
                    ) : null}
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
            onPageChange={onPageChange}
            itemLabel="deliveries"
          />
        </div>
      ) : null}
    </>
  );
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <Badge tone={DELIVERY_STATUS_TONE[status]}>{DELIVERY_STATUS_LABEL[status]}</Badge>;
}

/** A filter with a small visible label above it, so date fields say which end they are. */
export function FilterField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-caption text-grey-600">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * "Delivered", the parcel (tracking number and the merchant's order number) and the event id, which the merchant
 * can match in their own logs. A test ping has no parcel.
 */
function EventCell({ delivery }: { delivery: WebhookDelivery }) {
  const parcel = [
    delivery.trackingNumber ? formatTrackingNumber(delivery.trackingNumber) : null,
    delivery.merchantOrderRef,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-label text-grey-900">{deliveryEventLabel(delivery.eventType)}</span>
      {parcel ? <span className="text-body-sm text-grey-900 tabular-nums">{parcel}</span> : null}
      <span className="truncate font-mono text-caption text-grey-600" title={delivery.eventId}>
        {delivery.eventId}
      </span>
    </div>
  );
}

/**
 * The last attempt in plain words and, while PENDING, when the next one is due. Admins also see the short code
 * (e.g. HTTP_503, TIMEOUT), which helps when looking into a merchant's problem.
 */
function LastResult({ delivery, audience }: { delivery: WebhookDelivery; audience: DeliveryAudience }) {
  const next = delivery.status === "PENDING" && delivery.nextAttemptAt ? timeUntil(delivery.nextAttemptAt) : null;
  return (
    <div className="flex flex-col">
      <span className="text-body-sm text-grey-900">{lastResult(delivery, audience)}</span>
      {audience === "admin" && delivery.lastError ? (
        <span className="font-mono text-caption text-grey-600">{delivery.lastError}</span>
      ) : null}
      {next ? <span className="text-caption text-grey-600">Next attempt {next}</span> : null}
    </div>
  );
}

function RetryButton({
  deliveryId,
  onRetry,
  onRetried,
}: {
  deliveryId: string;
  onRetry: (deliveryId: string) => Promise<unknown>;
  onRetried: () => void;
}) {
  const [busy, setBusy] = React.useState(false);

  async function retry() {
    setBusy(true);
    try {
      await onRetry(deliveryId);
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

/**
 * Names the filters when only event and status are set ("No failed 'Delivered' deliveries"); with a search or dates
 * it says so plainly ("No deliveries match these filters"). `otherFilter` is a filter outside these five (e.g. the
 * admin's merchant), which also counts as "match these filters".
 */
export function deliveriesEmptyTitle(
  filters: DeliveryFilterValues,
  filtered: boolean,
  otherFilter = false,
): string {
  if (!filtered) return "No deliveries yet";
  const { eventType, status } = filters;
  const onlyEventOrStatus = filters.search.trim() === "" && filters.from === "" && filters.to === "" && !otherFilter;
  if (!onlyEventOrStatus) return "No deliveries match these filters";
  const statusWord = status === "" ? "" : `${DELIVERY_STATUS_LABEL[status].toLowerCase()} `;
  if (eventType === "") return `No ${statusWord}deliveries`;
  return `No ${statusWord}'${deliveryEventLabel(eventType)}' deliveries`;
}
