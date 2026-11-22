"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, CircleCheck, History, SearchX } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatTrackingNumber } from "@/lib/format";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import {
  HISTORY_DATES,
  HISTORY_PAGE_SIZE,
  HISTORY_TYPES,
  hasHistoryFilters,
  historyFilterQuery,
  historyHref,
  historyParams,
  parcelHrefFromHistory,
  type HistoryDate,
  type HistoryParams,
} from "../lib/history";
import { ASSIGNMENT_TYPE_LABEL, courierRoutes, taskProblemLabel } from "../lib/labels";
import { assignedRouteText, deliveryKey, splitCourierWork } from "../lib/parcel-view";
import type { CourierDelivery, CourierDeliveryPage, HistoryType } from "../types";
import { CopyTrackingNumber } from "./copy-tracking-number";
import { CourierLoadError } from "./courier-load-error";
import { ParcelStatusBadge, TaskTypeIcon } from "./task-badges";

const DESCRIPTION = "Parcels you finished, pickups and deliveries, newest first.";

/**
 * /courier/history: the parcels the courier completed (GET /courier/deliveries/history), newest completion first, 20
 * per page. A parcel is listed as soon as it is completed, even while the rest of its task is still in progress, and
 * once per task it was completed in (a failed delivery, then a new delivery). `?q=` searches by tracking number (the
 * shared header search on wider screens, a compact search here on phones, where the header search is hidden);
 * `?type=` and `?date=` (with `?from=`/`?to=` for a custom range) filter; `?page=` pages (1-based). The
 * backend filters before paging, so the count, the pages and the list always cover every matching entry. Contacts
 * are never shown here, and only pickups and deliveries are listed.
 */
export function CourierParcelHistory() {
  const params = historyParams(useSearchParams());
  const loaded = useCourierLoad(`courier-history:${historyHref(params)}`, (signal) =>
    courierApi.history(
      {
        page: params.page,
        size: HISTORY_PAGE_SIZE,
        trackingNumber: params.trackingNumber || undefined,
        ...historyFilterQuery(params),
      },
      signal,
    ),
  );

  return (
    <ListPage
      title="Parcel history"
      description={DESCRIPTION}
      toolbar={
        <div className="flex w-full flex-col gap-3">
          {/* Phones only: from 768px the shared header search (same ?q=) is shown instead. */}
          <HistorySearch key={params.trackingNumber} params={params} className="md:hidden" />
          <HistoryFilters params={params} />
        </div>
      }
    >
      {loaded.status === "loading" ? (
        <HistoryLoading />
      ) : loaded.status === "error" ? (
        <Card className="p-4 sm:p-6">
          <CourierLoadError error={loaded.error} title="We couldn't load your parcel history" onRetry={loaded.reload} />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <HistorySummary params={params} total={loaded.data.totalElements} />
          <HistoryList history={loaded.data} params={params} refreshing={loaded.refreshing} />
        </div>
      )}
    </ListPage>
  );
}

/**
 * Compact search by tracking number for phones (the shared header search is hidden there): one row, the label for
 * screen readers. Searching keeps the filters and starts again from the first page; "Clear" removes the search only.
 */
function HistorySearch({ params, className }: { params: HistoryParams; className?: string }) {
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("q") ?? "");
    router.push(historyHref({ ...params, trackingNumber: value, page: 0 }));
  }

  return (
    <form role="search" aria-label="Search parcel history" onSubmit={onSubmit} className={className}>
      <label htmlFor="history-tracking-number" className="sr-only">
        Tracking number
      </label>
      <div className="flex gap-2">
        <Input
          id="history-tracking-number"
          name="q"
          type="search"
          size="md"
          className="min-w-0 flex-1"
          defaultValue={params.trackingNumber}
          placeholder="Search by tracking number"
          autoComplete="off"
          aria-describedby="history-tracking-number-helper"
        />
        <Button type="submit" className="h-10 shrink-0">
          Search
        </Button>
        {params.trackingNumber ? (
          <Button asChild variant="secondary" className="h-10 shrink-0">
            <Link href={historyHref({ ...params, trackingNumber: "", page: 0 })}>Clear</Link>
          </Button>
        ) : null}
      </div>
      <p id="history-tracking-number-helper" className="sr-only">
        Shows only the times you finished this parcel.
      </p>
    </form>
  );
}

/**
 * Parcel type and completion date: two equal columns on wider screens, stacked on phones. Each change starts again
 * from the first page. A custom range adds two date fields under the row.
 */
function HistoryFilters({ params }: { params: HistoryParams }) {
  const router = useRouter();
  const go = (next: Partial<HistoryParams>) => router.push(historyHref({ ...params, ...next, page: 0 }));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Filter parcel history">
        <FilterField id="history-type" label="Parcel type">
          <Select
            id="history-type"
            size="md"
            value={params.type}
            onChange={(event) => go({ type: event.target.value as "" | HistoryType })}
          >
            <option value="">All types</option>
            {HISTORY_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField id="history-date" label="Completion date">
          <Select
            id="history-date"
            size="md"
            value={params.date}
            onChange={(event) => go({ date: event.target.value as HistoryDate, from: "", to: "" })}
          >
            <option value="">All dates</option>
            {HISTORY_DATES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterField>
      </div>
      {params.date === "custom" ? (
        <CustomRange key={`${params.from}:${params.to}`} params={params} onApply={(from, to) => go({ from, to })} />
      ) : null}
    </div>
  );
}

function FilterField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-label text-grey-900">
        {label}
      </label>
      {children}
    </div>
  );
}

/** From / to completion days (Sri Lankan dates, both included; either may be left open). */
function CustomRange({ params, onApply }: { params: HistoryParams; onApply: (from: string, to: string) => void }) {
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const from = String(data.get("from") ?? "");
    const to = String(data.get("to") ?? "");
    if (from && to && to < from) {
      setError("Choose an end date on or after the start date.");
      return;
    }
    setError(null);
    onApply(from, to);
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Custom completion dates"
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      noValidate
    >
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <FilterField id="history-from" label="From">
          <Input id="history-from" name="from" type="date" size="md" defaultValue={params.from} />
        </FilterField>
        <FilterField id="history-to" label="To">
          <Input
            id="history-to"
            name="to"
            type="date"
            size="md"
            defaultValue={params.to}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "history-range-error" : undefined}
          />
        </FilterField>
      </div>
      <Button type="submit" variant="secondary" className="h-10">
        Apply dates
      </Button>
      {error ? (
        <p id="history-range-error" role="alert" className="text-body-sm text-error sm:sr-only">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * The number of matching entries (all pages, as the backend counted them), naming the searched tracking number (on
 * wider screens the search box is the shared header's, so this is where an active search shows), and, while a filter
 * or a search is set, Clear filters (back to every entry).
 */
function HistorySummary({ params, total }: { params: HistoryParams; total: number }) {
  const active = hasHistoryFilters(params) || params.trackingNumber !== "";
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <p className="min-w-0 break-words text-body-sm text-grey-600 tabular-nums" aria-live="polite">
        {total} completed {total === 1 ? "entry" : "entries"}
        {params.trackingNumber ? ` for ${formatTrackingNumber(params.trackingNumber)}` : ""}
      </p>
      {active ? (
        <Button asChild variant="tertiary" className="h-10 shrink-0">
          <Link href={historyHref()}>Clear filters</Link>
        </Button>
      ) : null}
    </div>
  );
}

/** The page of parcels, or the right empty state (none yet, no matches, a page past the end). */
export function HistoryList({
  history,
  params,
  refreshing,
}: {
  history: CourierDeliveryPage;
  params: HistoryParams;
  refreshing: boolean;
}) {
  const districtName = useDistrictName();
  const { trackingNumber } = params;
  const filtered = hasHistoryFilters(params);

  if (history.content.length === 0) {
    return (
      <Card className="p-6 sm:p-10">
        {history.totalElements > 0 ? (
          // A page past the end (e.g. an old link): there are entries, just not on this page.
          <EmptyState
            icon={History}
            title="This page is empty"
            description="There are no parcels on this page."
            actions={
              <Button asChild variant="secondary">
                <Link href={historyHref({ ...params, page: 0 })}>Go to the first page</Link>
              </Button>
            }
          />
        ) : filtered || trackingNumber ? (
          <EmptyState
            icon={SearchX}
            title={
              trackingNumber && !filtered
                ? "No finished parcels with this tracking number"
                : "No finished parcels match"
            }
            description={
              trackingNumber && !filtered
                ? `You haven't finished a parcel with the number ${trackingNumber}. Check the number, or clear the search.`
                : "No completed entries match these filters. Change or clear them."
            }
            actions={
              <Button asChild variant="secondary">
                <Link href={courierRoutes.history}>{filtered ? "Clear filters" : "Clear search"}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={History}
            size="lg"
            title="No finished parcels yet"
            description="Parcels appear here as soon as you finish them: handed over, delivered, returned to the branch, or marked Unable to Collect."
            actions={
              <Button asChild variant="secondary">
                <Link href={courierRoutes.today}>Go to today&apos;s parcels</Link>
              </Button>
            }
          />
        )}
      </Card>
    );
  }

  // Pickups and deliveries only. A branch transfer isn't courier work: it is counted, never listed. The page numbers
  // stay the backend's.
  const { courier, other } = splitCourierWork(history.content);

  return (
    <Card aria-label={trackingNumber ? `Finished parcels for ${trackingNumber}` : "Finished parcels"} aria-busy={refreshing}>
      {other.length > 0 ? (
        <InlineNotice
          className="m-4 sm:mx-6"
          title={`${other.length} branch ${other.length === 1 ? "transfer" : "transfers"} on this page not shown`}
        >
          Branch transfers aren&apos;t courier work, so they aren&apos;t listed here.
        </InlineNotice>
      ) : null}
      <ul className="divide-y divide-grey-100">
        {courier.map((delivery) => (
          <HistoryRow key={deliveryKey(delivery)} delivery={delivery} districtName={districtName} />
        ))}
      </ul>
      <Pagination
        page={history.page}
        totalPages={history.totalPages}
        totalElements={history.totalElements}
        size={history.size}
        itemLabel="parcels"
        getHref={(target) => historyHref({ ...params, page: target })}
      />
    </Card>
  );
}

/**
 * One finished parcel in one task: type icon, tracking number and courier status, the route of that task's leg
 * (sender → branch for a pickup, branch → recipient for a delivery), when, and how it ended.
 */
export function HistoryRow({
  delivery,
  districtName,
}: {
  delivery: CourierDelivery;
  districtName: (code: string) => string;
}) {
  const tracking = formatTrackingNumber(delivery.trackingNumber);
  const { task } = delivery;
  const details: string[] = [];
  if (task.problem) details.push(`Reason: ${taskProblemLabel(task.problem)}`);
  if (task.receivedBy) details.push(`Received at the branch by ${task.receivedBy}`);

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <TaskTypeIcon type={task.type} className="hidden sm:flex" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <p className="text-label font-semibold text-grey-900 tabular-nums">{tracking}</p>
              <CopyTrackingNumber trackingNumber={delivery.trackingNumber} />
            </span>
            <ParcelStatusBadge delivery={delivery} />
            {/* The API sends proof only on the delivery entry that delivered the parcel; checked here as well. */}
            {delivery.proof?.hasPhoto && task.type === "DELIVERY" && task.outcome === "DELIVERED" ? (
              <Badge tone="outline" dot={false}>
                <Camera className="size-3.5" aria-hidden="true" />
                Proof attached
              </Badge>
            ) : null}
          </div>
          {/* This entry's own leg (its task), not the parcel's whole journey or a later task's route. */}
          <p className="break-words text-body-sm text-grey-900">
            {ASSIGNMENT_TYPE_LABEL[task.type]} · {assignedRouteText(delivery, districtName)}
          </p>
          {delivery.completedAt ? (
            <p className="flex items-center gap-1.5 text-label text-success tabular-nums">
              <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
              Completed {formatDateTime(delivery.completedAt)}
            </p>
          ) : null}
          {details.map((line) => (
            <p key={line} className="break-words text-body-sm text-grey-600">
              {line}
            </p>
          ))}
        </div>
      </div>

      <Button asChild variant="secondary" className="h-11 w-full sm:h-10 sm:w-auto">
        <Link href={parcelHrefFromHistory(delivery.parcelId, task.assignmentId)} aria-label={`Open parcel ${tracking}`}>
          Open
        </Link>
      </Button>
    </li>
  );
}

export function HistoryLoading() {
  return (
    <Card aria-busy="true" aria-label="Loading your parcel history">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3 border-b border-grey-100 p-4 last:border-b-0 sm:px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      ))}
    </Card>
  );
}
