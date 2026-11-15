"use client";

import { History, RotateCw } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
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
import { formatDateTime, formatTrackingNumber } from "@/lib/format";
import { webhooksApi } from "../api";
import { useDeliveries } from "../hooks/use-deliveries";
import {
  DELIVERY_EVENT_TYPES,
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_TONE,
  MAX_ATTEMPTS,
  deliveryEventLabel,
  lastResult,
  timeUntil,
} from "../labels";
import type { DeliveryEventType, DeliveryFilterValues, DeliveryStatus, WebhookDelivery } from "../types";

const COLUMNS = 6;
const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

const NO_FILTERS: DeliveryFilterValues = { status: "", eventType: "", search: "", from: "", to: "" };
/** Search after the merchant stops typing for this long (Enter searches at once). */
const SEARCH_DELAY_MS = 400;
/** Same limit as the backend. */
const MAX_SEARCH_LENGTH = 64;

/**
 * The delivery history of one webhook, newest first: search (tracking number, order number or an id), event,
 * status and date filters, pages of 20, Retry on failed deliveries. Any filter change starts again at page 1.
 * `refreshSignal` changes when the parent queued something (e.g. "Send test"), so the list loads again.
 */
export function DeliveryHistory({ webhookId, refreshSignal }: { webhookId: string; refreshSignal: number }) {
  const [filters, setFilters] = React.useState<DeliveryFilterValues>(NO_FILTERS);
  /** What's typed in the search box; it becomes `filters.search` after a short pause or on Enter. */
  const [searchText, setSearchText] = React.useState("");
  const [page, setPage] = React.useState(0);
  const deliveries = useDeliveries(webhookId, filters, page);
  const { reload } = deliveries;

  React.useEffect(() => {
    if (refreshSignal > 0) reload();
  }, [refreshSignal, reload]);

  // Search once typing pauses, so there's no request per key press.
  React.useEffect(() => {
    if (searchText.trim() === filters.search.trim()) return undefined;
    const timer = setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchText }));
      setPage(0);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, filters.search]);

  const content = deliveries.status === "ready" ? deliveries.data.content : [];
  const filtered =
    filters.status !== "" ||
    filters.eventType !== "" ||
    filters.search.trim() !== "" ||
    filters.from !== "" ||
    filters.to !== "" ||
    searchText.trim() !== "";

  function update(change: Partial<DeliveryFilterValues>) {
    setFilters((current) => ({ ...current, ...change }));
    setPage(0);
  }

  function clearFilters() {
    setFilters(NO_FILTERS);
    setSearchText("");
    setPage(0);
  }

  const clearButton = (
    <Button variant="tertiary" onClick={clearFilters}>
      Clear filters
    </Button>
  );

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
      />

      {/* Filters: search on its own line, then four filters (2 per row on tablets, 4 on desktops, stacked on phones). */}
      <div className="flex flex-col gap-3 border-b border-grey-200 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label htmlFor="deliveries-search" className="sr-only">
              Search deliveries
            </label>
            <Input
              id="deliveries-search"
              type="search"
              size="md"
              value={searchText}
              maxLength={MAX_SEARCH_LENGTH}
              autoComplete="off"
              spellCheck={false}
              placeholder="Search tracking number, order number or ID"
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") update({ search: searchText });
              }}
            />
          </div>
          {filtered ? clearButton : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField id="deliveries-event" label="Event">
            <Select
              id="deliveries-event"
              size="md"
              value={filters.eventType}
              onChange={(event) => update({ eventType: event.target.value as DeliveryEventType | "" })}
            >
              <option value="">All events</option>
              {DELIVERY_EVENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {deliveryEventLabel(value)}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField id="deliveries-status" label="Status">
            <Select
              id="deliveries-status"
              size="md"
              value={filters.status}
              onChange={(event) => update({ status: event.target.value as DeliveryStatus | "" })}
            >
              <option value="">All statuses</option>
              {DELIVERY_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {DELIVERY_STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField id="deliveries-from" label="From">
            <Input
              id="deliveries-from"
              type="date"
              size="md"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(event) => update({ from: event.target.value })}
            />
          </FilterField>
          <FilterField id="deliveries-to" label="To">
            <Input
              id="deliveries-to"
              type="date"
              size="md"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(event) => update({ to: event.target.value })}
            />
          </FilterField>
        </div>
      </div>

      {deliveries.status === "error" ? (
        <div className="p-4 sm:p-6">
          <InlineNotice tone="error" title="We couldn't load the deliveries">
            <p>{deliveries.error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={reload}>
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
              {filtered ? clearButton : null}
            </div>
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
              <li className="flex flex-col items-start gap-1 p-4">
                <span className="text-label text-grey-900">{emptyTitle(filters, filtered)}</span>
                <span className="text-body-sm text-grey-600">{emptyText(filtered)}</span>
                {filtered ? <div className="mt-2">{clearButton}</div> : null}
              </li>
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
                    title={emptyTitle(filters, filtered)}
                    description={emptyText(filtered)}
                    action={filtered ? clearButton : undefined}
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
          If your server doesn&apos;t receive a message, we try again right away, then after 1 min, 5 min, 15 min,
          1 h and 6 h. After {MAX_ATTEMPTS} tries, or if your server clearly refuses the message, it&apos;s marked
          Failed and you can send it again here. A test message is retried the same way.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- Pieces */

function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <Badge tone={DELIVERY_STATUS_TONE[status]}>{DELIVERY_STATUS_LABEL[status]}</Badge>;
}

/** A filter with a small visible label above it, so date fields say which end they are. */
function FilterField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
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
    ? "Try another search, event, status or dates, or clear the filters."
    : "Send a test to check your endpoint. Parcel events appear here as your orders move.";
}

/**
 * Names the filters when only event and status are set ("No failed 'Delivered' deliveries"); with a search or dates
 * it says so plainly ("No deliveries match these filters").
 */
function emptyTitle(filters: DeliveryFilterValues, filtered: boolean): string {
  if (!filtered) return "No deliveries yet";
  const { eventType, status } = filters;
  const onlyEventOrStatus = filters.search.trim() === "" && filters.from === "" && filters.to === "";
  if (!onlyEventOrStatus) return "No deliveries match these filters";
  const statusWord = status === "" ? "" : `${DELIVERY_STATUS_LABEL[status].toLowerCase()} `;
  if (eventType === "") return `No ${statusWord}deliveries`;
  return `No ${statusWord}'${deliveryEventLabel(eventType)}' deliveries`;
}
