"use client";

import { PackageSearch, RotateCw, Search, X } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
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
import { BranchSelect, useDistrictName } from "@/features/dispatch";
import { formatDateTime, formatTrackingNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, useAdminParcels } from "../hooks/use-admin-parcels";
import { failureReasonLabel, trackingStatusLabel } from "../labels";
import type { IndexedParcel, ParcelFilters, TrackingPlace, TrackingStatus } from "../types";
import { LiveIndicator, TrackingStatusBadge } from "./tracking-badges";
import { TrackingResult } from "./tracking-result";

const STATUSES: TrackingStatus[] = [
  "CREATED",
  "PICKED_UP",
  "AT_BRANCH",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
];

const NO_FILTERS: ParcelFilters = { q: "", status: "", district: "", from: "", to: "" };

function hasFilters(filters: ParcelFilters): boolean {
  return Object.values(filters).some((value) => value !== "");
}

/**
 * /admin/parcels (and /admin/dispatcher/tracking): every parcel's latest status, with filters (tracking number, status, district, last
 * updated between two days) and paging. Rows change live; select one to see its journey beside the list.
 */
export function AdminParcelTracking() {
  const [filters, setFilters] = React.useState<ParcelFilters>(NO_FILTERS);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const { name } = useDistrictName();
  const list = useAdminParcels(filters, page);

  const rows = list.data?.content ?? [];
  const datesWrong = filters.from !== "" && filters.to !== "" && filters.to < filters.from;

  function change(next: Partial<ParcelFilters>) {
    setFilters((current) => ({ ...current, ...next }));
    setPage(0);
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    change({ q: search.replace(/\s+/g, "") });
  }

  function clear() {
    setSearch("");
    setFilters(NO_FILTERS);
    setPage(0);
  }

  function place(value: TrackingPlace | null) {
    if (!value) return <span className="text-grey-600">Not known</span>;
    return (
      <>
        {value.city}
        <span className="block text-caption text-grey-600">{name(value.district)}</span>
      </>
    );
  }

  function where(parcel: IndexedParcel): string {
    if (parcel.status === "AT_BRANCH" && parcel.currentBranch) return `At ${name(parcel.currentBranch)} branch`;
    if (parcel.status === "FAILED" && parcel.failureReason) return failureReasonLabel(parcel.failureReason);
    return "";
  }

  function trackingButton(parcel: IndexedParcel) {
    return (
      <Button
        variant="link"
        className="h-auto p-0 font-medium tabular-nums"
        onClick={() => setSelected(parcel.trackingNumber)}
        aria-label={`Show the journey of ${formatTrackingNumber(parcel.trackingNumber)}`}
      >
        {formatTrackingNumber(parcel.trackingNumber)}
      </Button>
    );
  }

  const countFor = (status: TrackingStatus) => list.counts?.byStatus[status];
  const emptyTitle = hasFilters(filters) ? "No parcels match these filters" : "No parcels yet";
  const emptyDescription = hasFilters(filters)
    ? "Change or clear the filters to see more parcels."
    : "Parcels appear here when their status changes or someone looks them up.";

  return (
    <ListPage
      title="All parcels"
      description="Every parcel's latest status, updated live. Filter the list, then select a parcel to see its journey."
      toolbar={
        <div className="flex w-full flex-col gap-3">
          <form onSubmit={submitSearch} className="flex w-full gap-2 sm:max-w-md" role="search">
            <label htmlFor="admin-parcel-search" className="sr-only">
              Tracking number
            </label>
            <Input
              id="admin-parcel-search"
              size="md"
              value={search}
              maxLength={40}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tracking number, e.g. SD 2611"
              autoComplete="off"
            />
            <Button type="submit" variant="secondary">
              <Search aria-hidden="true" />
              Search
            </Button>
          </form>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-60">
              <label htmlFor="admin-parcel-status" className="sr-only">
                Status
              </label>
              <Select
                id="admin-parcel-status"
                size="md"
                value={filters.status}
                onChange={(event) => change({ status: event.target.value as TrackingStatus | "" })}
              >
                <option value="">
                  All statuses{list.counts ? ` (${list.counts.total})` : ""}
                </option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {trackingStatusLabel(status)}
                    {countFor(status) !== undefined ? ` (${countFor(status)})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <BranchSelect
              id="admin-parcel-district"
              label="District"
              value={filters.district}
              onChange={(district) => change({ district })}
              allLabel="All districts"
            />
            <div className="flex w-full gap-2 sm:w-auto">
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="admin-parcel-from" className="text-caption text-grey-600">
                  Updated from
                </label>
                <Input
                  id="admin-parcel-from"
                  type="date"
                  size="md"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(event) => change({ from: event.target.value })}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="admin-parcel-to" className="text-caption text-grey-600">
                  Updated to
                </label>
                <Input
                  id="admin-parcel-to"
                  type="date"
                  size="md"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(event) => change({ to: event.target.value })}
                />
              </div>
            </div>
            {hasFilters(filters) || search ? (
              <Button variant="secondary" onClick={clear}>
                <X aria-hidden="true" />
                Clear filters
              </Button>
            ) : null}
            <div className="flex items-center sm:ml-auto sm:self-center">
              <LiveIndicator state={list.connected ? "live" : "connecting"} />
            </div>
          </div>
        </div>
      }
    >
      {datesWrong ? (
        <InlineNotice tone="error" title="Check the dates">
          The end date can&apos;t be before the start date.
        </InlineNotice>
      ) : null}
      {list.missed > 0 ? (
        <InlineNotice title="New activity">
          <p>
            {list.missed} {list.missed === 1 ? "parcel has" : "parcels have"} changed since this list loaded.
          </p>
          <Button variant="secondary" className="mt-3" onClick={list.reload}>
            <RotateCw aria-hidden="true" />
            Refresh the list
          </Button>
        </InlineNotice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card aria-labelledby="admin-parcels-heading">
          <CardHeader
            title="Parcels"
            titleId="admin-parcels-heading"
            description={
              list.data
                ? `${list.data.totalElements} ${list.data.totalElements === 1 ? "parcel" : "parcels"}, most recently updated first`
                : undefined
            }
          />
          {list.status === "error" ? (
            <div className="p-4 sm:p-6">
              <InlineNotice tone="error" title="We couldn't load the parcels">
                <p>{list.error}</p>
                <Button variant="secondary" className="mt-3" onClick={list.reload}>
                  <RotateCw aria-hidden="true" />
                  Try again
                </Button>
              </InlineNotice>
            </div>
          ) : (
            <>
              {/* Phones: one card per parcel. */}
              <ul className="divide-y divide-grey-100 md:hidden" aria-busy={list.status === "loading"}>
                {list.status === "ready" && rows.length === 0 ? (
                  <li className="p-4 text-body-sm text-grey-600">{emptyTitle}.</li>
                ) : null}
                {rows.map((parcel) => (
                  <li
                    key={parcel.parcelId}
                    className={cn("flex flex-col gap-1 p-4", list.fresh.has(parcel.parcelId) && "bg-grey-50")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {trackingButton(parcel)}
                      <TrackingStatusBadge status={parcel.status} />
                    </div>
                    <span className="text-body-sm text-grey-600">
                      {parcel.from ? name(parcel.from.district) : "?"} → {parcel.to ? name(parcel.to.district) : "?"}
                    </span>
                    {where(parcel) ? <span className="text-body-sm text-grey-900">{where(parcel)}</span> : null}
                    <span className="text-caption text-grey-600">Updated {formatDateTime(parcel.updatedAt)}</span>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Last update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.status === "loading" ? (
                      <TableLoading columns={5} rows={5} label="Loading parcels" />
                    ) : rows.length === 0 ? (
                      <TableEmpty
                        columns={5}
                        icon={PackageSearch}
                        title={emptyTitle}
                        description={emptyDescription}
                      />
                    ) : (
                      rows.map((parcel) => (
                        <TableRow
                          key={parcel.parcelId}
                          className={cn(list.fresh.has(parcel.parcelId) && "bg-grey-50")}
                        >
                          <TableCell className="whitespace-nowrap">{trackingButton(parcel)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <TrackingStatusBadge status={parcel.status} />
                              {where(parcel) ? (
                                <span className="text-caption text-grey-600">{where(parcel)}</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{place(parcel.from)}</TableCell>
                          <TableCell>{place(parcel.to)}</TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {formatDateTime(parcel.updatedAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {list.data ? (
                <Pagination
                  page={list.data.page}
                  totalPages={list.data.totalPages}
                  totalElements={list.data.totalElements}
                  size={PAGE_SIZE}
                  onPageChange={setPage}
                  itemLabel="parcels"
                />
              ) : null}
            </>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          {selected ? (
            <TrackingResult key={selected} trackingNumber={selected} />
          ) : (
            <Card>
              <CardHeader
                title="Parcel journey"
                description="Select a tracking number in the list to see every step, updated live."
              />
            </Card>
          )}
        </div>
      </div>
    </ListPage>
  );
}
