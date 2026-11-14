"use client";

import { Package, SearchX } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PARCEL_STATUS_LABEL, PARCEL_STATUSES, StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { useDistricts } from "@/hooks/use-districts";
import { formatDate, formatTrackingNumber, humanizeCode } from "@/lib/format";
import type { ParcelStatus } from "@/types";
import { useDeliveries } from "../hooks/use-deliveries";
import { CREATE_DELIVERY_HREF, deliveryHref } from "../routes";
import type { Delivery } from "../types";

const PAGE_SIZE = 20;

/**
 * My deliveries (GET /deliveries): the customer's deliveries, newest first, 20 a page, with a status filter.
 * Cards on phones, a table from md up; each tracking number opens the delivery's details.
 */
export function MyDeliveries() {
  const [page, setPage] = React.useState(0);
  const [status, setStatus] = React.useState<ParcelStatus | "">("");
  const { state, retry } = useDeliveries({ page, size: PAGE_SIZE, status: status === "" ? undefined : status });
  const districts = useDistricts();

  const districtName = (code: string) =>
    districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code);

  // A new filter starts again on the first page.
  const changeStatus = (value: ParcelStatus | "") => {
    setStatus(value);
    setPage(0);
  };

  const changePage = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex flex-col gap-6">
      <FormField id="status-filter" label="Status" className="sm:max-w-xs">
        {(a11y) => (
          <Select
            {...a11y}
            size="md"
            value={status}
            onChange={(event) => changeStatus(event.target.value as ParcelStatus | "")}
          >
            <option value="">All statuses</option>
            {PARCEL_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PARCEL_STATUS_LABEL[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <Card aria-label="Your deliveries">
        {state.status === "loading" ? <LoadingRows /> : null}

        {state.status === "error" ? (
          <div className="flex flex-col items-start gap-4 p-4 sm:p-6">
            <InlineNotice tone="error" title="We couldn't load your deliveries">
              {state.message}
            </InlineNotice>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : null}

        {state.status === "ready" && state.data.totalElements === 0 ? (
          <div className="p-6 sm:p-10">
            {status === "" ? (
              <EmptyState
                icon={Package}
                title="You haven’t sent any parcels yet"
                description="Every parcel you send will be listed here with its latest status."
                actions={
                  <Button asChild>
                    <Link href={CREATE_DELIVERY_HREF}>Create delivery</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title={`No deliveries are “${PARCEL_STATUS_LABEL[status]}”`}
                description="Choose another status, or show all your deliveries."
                actions={
                  <Button variant="secondary" onClick={() => changeStatus("")}>
                    Show all deliveries
                  </Button>
                }
              />
            )}
          </div>
        ) : null}

        {state.status === "ready" && state.data.totalElements > 0 ? (
          <>
            {/* Phones: one card per delivery */}
            <ul className="divide-y divide-grey-100 md:hidden">
              {state.data.content.map((delivery) => (
                <li key={delivery.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <TrackingLink delivery={delivery} />
                    <StatusBadge status={delivery.status} />
                  </div>
                  <p className="text-body-sm text-grey-900">To {delivery.recipient.name}</p>
                  <p className="text-body-sm text-grey-600">
                    {delivery.recipient.city}, {districtName(delivery.recipient.district)} · Booked{" "}
                    <span className="tabular-nums">{formatDate(delivery.createdAt)}</span>
                  </p>
                </li>
              ))}
            </ul>

            {/* Tablet and up: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking number</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Booked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.data.content.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <TrackingLink delivery={delivery} />
                      </TableCell>
                      <TableCell>
                        <p className="text-grey-900">{delivery.recipient.name}</p>
                        <p className="text-grey-600">
                          {delivery.recipient.city}, {districtName(delivery.recipient.district)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={delivery.status} />
                      </TableCell>
                      <TableCell className="tabular-nums">{formatDate(delivery.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              page={state.data.page}
              totalPages={state.data.totalPages}
              totalElements={state.data.totalElements}
              size={state.data.size}
              onPageChange={changePage}
              itemLabel="deliveries"
            />
          </>
        ) : null}
      </Card>
    </div>
  );
}

function TrackingLink({ delivery }: { delivery: Delivery }) {
  return (
    <TextLink href={deliveryHref(delivery.id)} className="text-label tabular-nums">
      {formatTrackingNumber(delivery.trackingNumber)}
    </TextLink>
  );
}

function LoadingRows() {
  return (
    <div aria-busy="true" aria-label="Loading your deliveries" className="flex flex-col">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-6 border-b border-grey-100 px-4 py-4 last:border-b-0 sm:px-6">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
