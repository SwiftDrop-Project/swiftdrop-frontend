"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Pagination } from "@/components/ui/pagination";
import { PARCEL_STATUS_LABEL, StatusBadge } from "@/components/ui/status-badge";
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
import { ListPage } from "@/components/layout/list-page";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiError } from "@/lib/api";
import { formatDate, formatPhone, formatRs, formatTrackingNumber } from "@/lib/format";
import type { ParcelStatus } from "@/types";
import { merchantOrdersApi } from "../api";
import type { MerchantOrder } from "../types";

const PAGE_SIZE = 20;
const COLUMNS = 5;

type Filter = "ALL" | ParcelStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "CREATED", label: PARCEL_STATUS_LABEL.CREATED },
  { value: "PICKED_UP", label: PARCEL_STATUS_LABEL.PICKED_UP },
  { value: "IN_TRANSIT", label: PARCEL_STATUS_LABEL.IN_TRANSIT },
  { value: "OUT_FOR_DELIVERY", label: PARCEL_STATUS_LABEL.OUT_FOR_DELIVERY },
  { value: "DELIVERED", label: PARCEL_STATUS_LABEL.DELIVERED },
  { value: "FAILED", label: PARCEL_STATUS_LABEL.FAILED },
];

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; orders: MerchantOrder[]; page: number; totalPages: number; totalElements: number };

/**
 * Paginated orders table for the merchant (/merchant/orders). With `renderOrderDetails`, clicking an order (or its
 * tracking number) opens a side panel with the order's details and whatever that function renders below them, e.g.
 * the webhooks feature's messages about the order. This feature doesn't know what goes there, so it never imports
 * the other feature.
 */
export function MerchantOrdersList({
  renderOrderDetails,
}: {
  renderOrderDetails?: (order: MerchantOrder) => React.ReactNode;
} = {}) {
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [page, setPage] = React.useState(0);
  const [attempt, setAttempt] = React.useState(0);
  const [list, setList] = React.useState<ListState>({ status: "loading" });
  const [selected, setSelected] = React.useState<MerchantOrder | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    merchantOrdersApi
      .list({ page, size: PAGE_SIZE, status: filter === "ALL" ? undefined : filter }, controller.signal)
      .then((res) =>
        setList({ status: "ready", orders: res.content, page: res.page, totalPages: res.totalPages, totalElements: res.totalElements }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setList({ status: "error", message: isApiError(error) ? error.message : "Something went wrong. Try again." });
      });
    return () => controller.abort();
  }, [filter, page, attempt]);

  function handleFilter(next: Filter) {
    setList({ status: "loading" });
    setFilter(next);
    setPage(0);
  }

  function handlePageChange(next: number) {
    setList({ status: "loading" });
    setPage(next);
  }

  return (
    <ListPage
      title="Orders"
      description="All orders you have created, newest first."
      action={
        <Button asChild>
          <Link href="/merchant/orders/new">
            <Plus aria-hidden="true" />
            Create order
          </Link>
        </Button>
      }
      toolbar={<StatusFilter active={filter} onChange={handleFilter} />}
    >
      <Card aria-label="Orders">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking no.</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.status === "loading" ? (
              <TableLoading columns={COLUMNS} label="Loading orders" />
            ) : list.status === "error" ? (
              <TableRow>
                <TableCell colSpan={COLUMNS} className="p-6">
                  <div className="flex flex-col gap-4">
                    <InlineNotice tone="error" title="We couldn&apos;t load your orders">
                      {list.message}
                    </InlineNotice>
                    <Button
                      variant="secondary"
                      className="self-start"
                      onClick={() => { setList({ status: "loading" }); setAttempt((n) => n + 1); }}
                    >
                      Try again
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : list.orders.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                icon={ClipboardList}
                title={filter === "ALL" ? "No orders yet" : `No ${PARCEL_STATUS_LABEL[filter as ParcelStatus].toLowerCase()} orders`}
                description={
                  filter === "ALL"
                    ? "Create an order and a rider will collect it from your pickup address."
                    : "Try a different status filter."
                }
                action={
                  filter === "ALL" ? (
                    <Button asChild>
                      <Link href="/merchant/orders/new">
                        <Plus aria-hidden="true" />
                        Create order
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              list.orders.map((order) => (
                <TableRow
                  key={order.id}
                  className={renderOrderDetails ? "cursor-pointer hover:bg-grey-50" : undefined}
                  onClick={renderOrderDetails ? () => setSelected(order) : undefined}
                >
                  <TableCell>
                    {renderOrderDetails ? (
                      // the keyboard way to open the panel (the row click is for the mouse)
                      <Button
                        variant="link"
                        className="tabular-nums"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(order);
                        }}
                      >
                        {formatTrackingNumber(order.trackingNumber)}
                      </Button>
                    ) : (
                      <span className="tabular-nums text-label text-grey-900">
                        {formatTrackingNumber(order.trackingNumber)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-grey-900">{order.recipient.name}</p>
                    <p className="text-grey-600 tabular-nums">{formatPhone(order.recipient.phone)}</p>
                  </TableCell>
                  <TableCell className="text-grey-600">
                    {order.merchantOrderRef ?? <span className="text-grey-400">—</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-grey-600">
                    {formatDate(order.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {list.status === "ready" && list.totalPages > 1 ? (
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            totalElements={list.totalElements}
            size={PAGE_SIZE}
            onPageChange={handlePageChange}
            itemLabel="orders"
          />
        ) : null}
      </Card>

      {renderOrderDetails ? (
        <Sheet open={selected !== null} onOpenChange={(open) => (open ? undefined : setSelected(null))}>
          <SheetContent side="right" className="w-full! max-w-full overflow-y-auto sm:w-md!">
            {selected ? (
              <div className="flex flex-col gap-6 p-6 pt-14">
                <div className="flex flex-col gap-1">
                  <SheetTitle className="tabular-nums">{formatTrackingNumber(selected.trackingNumber)}</SheetTitle>
                  <SheetDescription>
                    {selected.merchantOrderRef ? `Your reference ${selected.merchantOrderRef}` : "No reference"}
                  </SheetDescription>
                  <div className="mt-2">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-4 text-body-sm">
                  <OrderField label="Recipient">
                    {selected.recipient.name}
                    <span className="block text-grey-600 tabular-nums">{formatPhone(selected.recipient.phone)}</span>
                  </OrderField>
                  <OrderField label="Created">
                    <span className="tabular-nums">{formatDate(selected.createdAt)}</span>
                  </OrderField>
                  <OrderField label="Weight">
                    <span className="tabular-nums">{selected.weightKg} kg</span>
                  </OrderField>
                  <OrderField label="Cash on delivery">
                    <span className="tabular-nums">
                      {selected.codAmount !== null ? formatRs(selected.codAmount) : "None"}
                    </span>
                  </OrderField>
                </dl>
                {renderOrderDetails(selected)}
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </ListPage>
  );
}

function OrderField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-grey-600">{label}</dt>
      <dd className="text-grey-900">{children}</dd>
    </div>
  );
}

function StatusFilter({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
      {FILTERS.map((f) => (
        <Button
          key={f.value}
          variant={active === f.value ? "primary" : "secondary"}
          onClick={() => onChange(f.value)}
          aria-pressed={active === f.value}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
