"use client";

import Link from "next/link";
import {
  CircleCheck,
  CircleX,
  Clock,
  Download,
  Package,
  Search,
  Truck,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { formatDate, formatRs, formatTrackingNumber, humanizeCode } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PageResponse } from "@/types";
import { reportingApi } from "../api";
import { formatCount } from "../lib/labels";
import { PAYMENT_OPTIONS, SENDER_TYPE_LABEL, SORT_OPTIONS, STATUS_FILTER_OPTIONS } from "../lib/parcel-labels";
import type { AdminParcel, ParcelFilters, ParcelPaymentFilter, ParcelSort, ParcelStats } from "../types";

const PAGE_SIZE = 20;
const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pageData: PageResponse<AdminParcel> };

type StatsState = { status: "loading" } | { status: "error" } | { status: "ready"; stats: ParcelStats };

/** Every parcel on the platform (GET /admin/parcels): summary cards, search, filters, table and CSV export. */
export function ParcelDirectory() {
  const districts = useDistricts();

  // Filters
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [pickupDistrict, setPickupDistrict] = React.useState("");
  const [deliveryDistrict, setDeliveryDistrict] = React.useState("");
  const [createdFrom, setCreatedFrom] = React.useState("");
  const [createdTo, setCreatedTo] = React.useState("");
  const [payment, setPayment] = React.useState<"" | ParcelPaymentFilter>("");
  const [sort, setSort] = React.useState<ParcelSort>("NEWEST");
  const [page, setPage] = React.useState(0);

  // Data
  const [state, setState] = React.useState<ListState>({ status: "loading" });
  const [stats, setStats] = React.useState<StatsState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  const dateError =
    createdFrom && createdTo && createdFrom > createdTo ? "The start date must be on or before the end date." : null;

  const filters: ParcelFilters = React.useMemo(
    () => ({
      q: query || undefined,
      statuses: STATUS_FILTER_OPTIONS.find((option) => option.value === statusFilter)?.statuses,
      pickupDistrict: pickupDistrict || undefined,
      deliveryDistrict: deliveryDistrict || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      payment: payment || undefined,
      sort,
    }),
    [query, statusFilter, pickupDistrict, deliveryDistrict, createdFrom, createdTo, payment, sort],
  );

  // Search waits until typing pauses.
  React.useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query) return undefined;
    const timer = window.setTimeout(() => {
      setState({ status: "loading" });
      setQuery(trimmed);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, query]);

  React.useEffect(() => {
    if (dateError) return undefined;
    const controller = new AbortController();
    reportingApi
      .listParcels(filters, page, PAGE_SIZE, controller.signal)
      .then((pageData) => setState({ status: "ready", pageData }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: isApiError(error) ? error.message : UNKNOWN_ERROR });
      });
    return () => controller.abort();
  }, [filters, page, attempt, dateError]);

  React.useEffect(() => {
    const controller = new AbortController();
    reportingApi
      .parcelStats(controller.signal)
      .then((data) => setStats({ status: "ready", stats: data }))
      .catch(() => {
        if (!controller.signal.aborted) setStats({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = React.useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  /** Sets a filter and goes back to the first page. */
  function applyFilter(update: () => void) {
    setState({ status: "loading" });
    update();
    setPage(0);
  }

  const hasFilters = Boolean(
    searchInput.trim() || statusFilter || pickupDistrict || deliveryDistrict || createdFrom || createdTo || payment,
  );

  function clearFilters() {
    applyFilter(() => {
      setSearchInput("");
      setQuery("");
      setStatusFilter("");
      setPickupDistrict("");
      setDeliveryDistrict("");
      setCreatedFrom("");
      setCreatedTo("");
      setPayment("");
    });
  }

  const districtName = (code: string | null) =>
    code ? (districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code)) : "—";

  const districtOptions = districts.districts.map((district) => (
    <option key={district.code} value={district.code}>
      {district.name}
    </option>
  ));

  const exportAction = dateError ? (
    <Button variant="secondary" disabled>
      <Download aria-hidden="true" />
      Export CSV
    </Button>
  ) : (
    <Button asChild variant="secondary">
      <a href={reportingApi.parcelExportUrl(filters)} rel="noopener">
        <Download aria-hidden="true" />
        Export CSV
      </a>
    </Button>
  );

  return (
    <ListPage
      title="All Parcels"
      description="Monitor every SwiftDrop delivery, from booking to hand-over."
      action={exportAction}
    >
      <StatsCards state={stats} />

      <Card aria-labelledby="parcels-heading">
        <CardHeader
          title="Parcel records"
          titleId="parcels-heading"
          description="Courier assignments are handled by dispatchers."
          aside={
            state.status === "ready" ? (
              <span className="text-label text-grey-600 tabular-nums">
                {formatCount(state.pageData.totalElements)}{" "}
                {state.pageData.totalElements === 1 ? "parcel" : "parcels"}
              </span>
            ) : null
          }
        />

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 border-b border-grey-200 p-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-12 lg:items-end">
          <FilterField id="parcel-search" label="Search" className="sm:col-span-2 lg:col-span-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-grey-500"
                aria-hidden="true"
              />
              <Input
                id="parcel-search"
                type="search"
                size="md"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tracking number, name, mobile or parcel ID"
                className="pl-10 text-body-sm"
              />
            </div>
          </FilterField>

          <FilterField id="parcel-status" label="Status" className="lg:col-span-2">
            <Select
              id="parcel-status"
              size="md"
              value={statusFilter}
              onChange={(event) => applyFilter(() => setStatusFilter(event.target.value))}
            >
              <option value="">All statuses</option>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField id="parcel-payment" label="Payment" className="lg:col-span-2">
            <Select
              id="parcel-payment"
              size="md"
              value={payment}
              onChange={(event) => applyFilter(() => setPayment(event.target.value as "" | ParcelPaymentFilter))}
            >
              <option value="">All payments</option>
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField id="parcel-sort" label="Sort by" className="lg:col-span-2">
            <Select
              id="parcel-sort"
              size="md"
              value={sort}
              onChange={(event) => applyFilter(() => setSort(event.target.value as ParcelSort))}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FilterField>

          <div className="flex items-end lg:col-span-2 lg:justify-end">
            {hasFilters ? (
              <Button type="button" variant="tertiary" onClick={clearFilters} className="w-full lg:w-auto">
                Clear filters
              </Button>
            ) : null}
          </div>

          <FilterField id="parcel-pickup-district" label="Pickup district" className="lg:col-span-3">
            <Select
              id="parcel-pickup-district"
              size="md"
              value={pickupDistrict}
              disabled={districts.status !== "ready"}
              onChange={(event) => applyFilter(() => setPickupDistrict(event.target.value))}
            >
              <option value="">All districts</option>
              {districtOptions}
            </Select>
          </FilterField>

          <FilterField id="parcel-delivery-district" label="Delivery district" className="lg:col-span-3">
            <Select
              id="parcel-delivery-district"
              size="md"
              value={deliveryDistrict}
              disabled={districts.status !== "ready"}
              onChange={(event) => applyFilter(() => setDeliveryDistrict(event.target.value))}
            >
              <option value="">All districts</option>
              {districtOptions}
            </Select>
          </FilterField>

          <FilterField id="parcel-created-from" label="Booked from" className="lg:col-span-3">
            <Input
              id="parcel-created-from"
              type="date"
              size="md"
              value={createdFrom}
              max={createdTo || undefined}
              onChange={(event) => applyFilter(() => setCreatedFrom(event.target.value))}
              className="text-body-sm"
            />
          </FilterField>

          <FilterField id="parcel-created-to" label="Booked to" className="lg:col-span-3">
            <Input
              id="parcel-created-to"
              type="date"
              size="md"
              value={createdTo}
              min={createdFrom || undefined}
              onChange={(event) => applyFilter(() => setCreatedTo(event.target.value))}
              className="text-body-sm"
            />
          </FilterField>
        </div>

        {dateError ? (
          <div className="p-4 sm:p-6">
            <InlineNotice tone="error" title="Check the booking dates">
              {dateError}
            </InlineNotice>
          </div>
        ) : state.status === "error" ? (
          <div className="flex flex-col items-start gap-4 p-4 sm:p-6">
            <InlineNotice tone="error" title="We couldn't load the parcels">
              {state.message}
            </InlineNotice>
            <Button variant="secondary" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : state.status === "loading" ? (
          <TableSkeleton />
        ) : state.pageData.content.length === 0 ? (
          <div className="p-6 sm:p-10">
            <EmptyState
              icon={Package}
              title={hasFilters ? "No parcels match these filters" : "No parcels yet"}
              description={
                hasFilters
                  ? "Try a different search, status, district, date or payment filter."
                  : "Parcels appear here as soon as customers or merchants book them."
              }
              actions={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Phones: one card per parcel */}
            <ul className="divide-y divide-grey-100 md:hidden">
              {state.pageData.content.map((parcel) => (
                <li key={parcel.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <ParcelNumberCell parcel={parcel} />
                    <StatusBadge status={parcel.status} />
                  </div>
                  <p className="text-body-sm text-grey-800">
                    {parcel.senderName} <span className="text-grey-500">→</span> {parcel.receiverName}
                  </p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                    <dt className="text-grey-600">Route</dt>
                    <dd>
                      {districtName(parcel.pickupDistrict)} → {districtName(parcel.deliveryDistrict)}
                    </dd>
                    <dt className="text-grey-600">Fee</dt>
                    <dd className="tabular-nums">{formatRs(parcel.feeAmount)}</dd>
                    <dt className="text-grey-600">Booked</dt>
                    <dd className="tabular-nums">{formatDate(parcel.createdAt)}</dd>
                  </dl>
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={`/admin/parcels/${parcel.id}`}>View details</Link>
                  </Button>
                </li>
              ))}
            </ul>

            {/* Tablets and desktops: table */}
            <div className="hidden md:block">
              <Table>
                <TableCaption className="sr-only">SwiftDrop parcels</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcel</TableHead>
                    <TableHead>Sender → receiver</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Booked</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.pageData.content.map((parcel) => (
                    <TableRow key={parcel.id}>
                      <TableCell>
                        <ParcelNumberCell parcel={parcel} />
                      </TableCell>
                      <TableCell>
                        <p className="text-grey-900">{parcel.senderName}</p>
                        <p className="text-grey-600">to {parcel.receiverName}</p>
                        <p className="text-caption text-grey-500">{SENDER_TYPE_LABEL[parcel.senderType]} booking</p>
                      </TableCell>
                      <TableCell>
                        <p>
                          {parcel.pickupCity}, {districtName(parcel.pickupDistrict)}
                        </p>
                        <p className="text-grey-600">
                          to {parcel.deliveryCity}, {districtName(parcel.deliveryDistrict)}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDate(parcel.createdAt)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        <p>{formatRs(parcel.feeAmount)}</p>
                        {parcel.codAmount !== null ? (
                          <p className="text-caption text-grey-600">COD {formatRs(parcel.codAmount)}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={parcel.status} />
                          {parcel.currentBranch ? (
                            <span className="text-caption text-grey-600">
                              {districtName(parcel.currentBranch)} branch
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="secondary">
                          <Link href={`/admin/parcels/${parcel.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              page={state.pageData.page}
              totalPages={state.pageData.totalPages}
              totalElements={state.pageData.totalElements}
              size={state.pageData.size}
              onPageChange={(nextPage) => {
                setState({ status: "loading" });
                setPage(nextPage);
              }}
              itemLabel="parcels"
            />
          </>
        )}
      </Card>
    </ListPage>
  );
}

/* ---------------------------------------------------------------- Pieces */

function FilterField({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-caption text-grey-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function ParcelNumberCell({ parcel }: { parcel: AdminParcel }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link
        href={`/admin/parcels/${parcel.id}`}
        className="text-label font-semibold whitespace-nowrap text-grey-900 tabular-nums hover:text-orange-700 hover:underline"
      >
        {formatTrackingNumber(parcel.trackingNumber)}
      </Link>
      <span className="text-caption text-grey-500 tabular-nums" title={parcel.id}>
        ID {parcel.id.slice(0, 8).toUpperCase()}
      </span>
    </div>
  );
}

interface StatCard {
  label: string;
  note: string;
  icon: LucideIcon;
  value: (stats: ParcelStats) => number;
  /** Green and red only for delivery outcomes (DESIGN.md §1). */
  tone?: "success" | "error";
}

const STAT_CARDS: StatCard[] = [
  { label: "Total parcels", note: "Every booked parcel", icon: Package, value: (s) => s.total },
  { label: "Pending", note: "Waiting for pickup", icon: Clock, value: (s) => s.pending },
  { label: "In transit", note: "Picked up and on the way", icon: Truck, value: (s) => s.inTransit },
  { label: "Delivered", note: "Handed to the receiver", icon: CircleCheck, value: (s) => s.delivered, tone: "success" },
  { label: "Failed", note: "Delivery attempt failed", icon: CircleX, value: (s) => s.failed, tone: "error" },
];

const ICON_TONE = { success: "text-success", error: "text-error" } as const;

function StatsCards({ state }: { state: StatsState }) {
  return (
    <section aria-label="Parcel summary" aria-busy={state.status === "loading"}>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STAT_CARDS.map(({ label, note, icon: Icon, value, tone }) => (
          <Card key={label} className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-label text-grey-700">{label}</dt>
              <Icon className={cn("size-5", tone ? ICON_TONE[tone] : "text-grey-500")} aria-hidden="true" />
            </div>
            <dd className="flex flex-col gap-1">
              {state.status === "ready" ? (
                <span className="text-display text-grey-900 tabular-nums">{formatCount(value(state.stats))}</span>
              ) : state.status === "error" ? (
                <span className="text-display text-grey-400">—</span>
              ) : (
                <Skeleton className="h-10 w-20" />
              )}
              <span className="text-body-sm text-grey-600">{note}</span>
            </dd>
          </Card>
        ))}
      </dl>
      {state.status === "error" ? (
        <p className="mt-2 text-body-sm text-grey-600">The summary figures couldn&apos;t be loaded.</p>
      ) : null}
    </section>
  );
}

function TableSkeleton() {
  return (
    <>
      <div className="flex flex-col divide-y divide-grey-100 md:hidden" aria-busy="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parcel</TableHead>
              <TableHead>Sender → receiver</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Booked</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoading columns={7} rows={5} label="Loading parcels" />
          </TableBody>
        </Table>
      </div>
    </>
  );
}
