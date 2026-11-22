"use client";

import { Package, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { PageColumns } from "@/components/layout/page-columns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextLink } from "@/components/ui/text-link";
import { formatDate, formatRs, formatTrackingNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDeliveries } from "../hooks/use-deliveries";
import { CREATE_DELIVERY_HREF, deliveryHref, myDeliveriesHref } from "../routes";
import { DELIVERY_TABS, MAX_DELIVERY_SEARCH, deliveryTab, parseDeliveryTab, type DeliveryTab } from "../tabs";
import type { Delivery } from "../types";
import { ReceiptPreview } from "./receipt-preview";

const PAGE_SIZE = 20;

function route(delivery: Delivery): string {
  return `${delivery.pickup.city} → ${delivery.recipient.city}`;
}

/**
 * My deliveries (GET /deliveries): the customer's deliveries, newest first, 20 a page, in four tabs (All, Active,
 * Delivered, Failed) with a tracking number search, and the receipt of the chosen one beside them (the first on the
 * page until another is chosen). The tab and the search live in the address (`?tab=`, `?q=`), so the header search
 * lands here and a filtered list can be shared or reloaded. Cards on phones, a table from md up; each tracking number
 * opens the delivery's details.
 */
export function MyDeliveries() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseDeliveryTab(searchParams.get("tab"));
  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_DELIVERY_SEARCH);

  // The page belongs to one tab and search: a new tab or search starts again on the first page.
  const filterKey = `${tab}|${q}`;
  const [paging, setPaging] = React.useState({ filterKey, page: 0 });
  const page = paging.filterKey === filterKey ? paging.page : 0;

  const [chosenId, setChosenId] = React.useState<string | null>(null);
  const { state, retry } = useDeliveries({ page, size: PAGE_SIZE, status: deliveryTab(tab).statuses, q });

  // The chosen delivery while it is on this page; otherwise the first one, so the preview is never stale.
  const deliveries = state.status === "ready" ? state.data.content : [];
  const selectedId = deliveries.some((delivery) => delivery.id === chosenId)
    ? chosenId
    : (deliveries[0]?.id ?? null);

  const show = (next: { tab: DeliveryTab; q: string }) => router.replace(myDeliveriesHref(next), { scroll: false });

  const changePage = (next: number) => {
    setPaging({ filterKey, page: next });
    window.scrollTo({ top: 0 });
  };

  // On phones the preview is below the list: bring it into view.
  const showReceipt = (id: string, scroll: boolean) => {
    setChosenId(id);
    if (scroll) document.getElementById("receipt-preview")?.scrollIntoView({ behavior: "smooth" });
  };

  const showPreview = state.status === "ready" && state.data.totalElements > 0;

  return (
    <Tabs value={tab} onValueChange={(value) => show({ tab: parseDeliveryTab(value), q })}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <TabsList variant="pills" aria-label="Show deliveries" className="md:shrink-0">
          {DELIVERY_TABS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* Keyed by the search, so the box shows the address's search after the header search or "Clear". */}
        <DeliverySearch key={q} q={q} onSearch={(value) => show({ tab, q: value })} />
      </div>

      <TabsContent value={tab}>
        <PageColumns aside={showPreview ? <ReceiptPreview deliveryId={selectedId} /> : undefined}>
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
                {q !== "" ? (
                  <EmptyState
                    icon={SearchX}
                    title={`No delivery matches “${q}”`}
                    description={
                      tab === "all"
                        ? "Check the tracking number, or clear the search."
                        : `We searched your ${deliveryTab(tab).label.toLowerCase()} deliveries only. Check the tracking number, or search all of them.`
                    }
                    actions={
                      <Button variant="secondary" onClick={() => show({ tab: "all", q: tab === "all" ? "" : q })}>
                        {tab === "all" ? "Clear search" : "Search all deliveries"}
                      </Button>
                    }
                  />
                ) : tab === "all" ? (
                  <EmptyState
                    icon={Package}
                    title="You haven’t sent any parcels yet"
                    description="Every parcel you send will be listed here with its latest status and receipt."
                    actions={
                      <Button asChild>
                        <Link href={CREATE_DELIVERY_HREF}>Create delivery</Link>
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={SearchX}
                    title={deliveryTab(tab).emptyTitle}
                    description="Your other deliveries are under All."
                    actions={
                      <Button variant="secondary" onClick={() => show({ tab: "all", q })}>
                        Show all deliveries
                      </Button>
                    }
                  />
                )}
              </div>
            ) : null}

            {showPreview && state.status === "ready" ? (
              <>
                {/* Phones: one card per delivery */}
                <ul className="divide-y divide-grey-100 md:hidden">
                  {deliveries.map((delivery) => {
                    const selected = delivery.id === selectedId;
                    return (
                      <li key={delivery.id} className={cn("flex flex-col gap-2 p-4", selected && "bg-orange-50")}>
                        <div className="flex items-start justify-between gap-3">
                          <TrackingLink delivery={delivery} />
                          <StatusBadge status={delivery.status} />
                        </div>
                        <p className="text-body-sm text-grey-900">{route(delivery)}</p>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-body-sm text-grey-600 tabular-nums">
                            {formatDate(delivery.createdAt)} · {formatRs(delivery.feeAmount)}
                          </p>
                          <ReceiptButton
                            selected={selected}
                            onClick={() => showReceipt(delivery.id, true)}
                            trackingNumber={delivery.trackingNumber}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Tablet and up: table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking number</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead className="text-right">
                          <span className="sr-only">Receipt</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => {
                        const selected = delivery.id === selectedId;
                        return (
                          <TableRow
                            key={delivery.id}
                            aria-selected={selected}
                            className={cn(selected && "bg-orange-50")}
                          >
                            {/* The booked date sits under the tracking number, so the table fits beside the receipt. */}
                            <TableCell className="whitespace-nowrap">
                              <TrackingLink delivery={delivery} />
                              <p className="mt-1 text-caption text-grey-600 tabular-nums">
                                Booked {formatDate(delivery.createdAt)}
                              </p>
                            </TableCell>
                            <TableCell className="text-grey-700">{route(delivery)}</TableCell>
                            <TableCell>
                              <StatusBadge status={delivery.status} />
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap tabular-nums">
                              {formatRs(delivery.feeAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <ReceiptButton
                                selected={selected}
                                onClick={() => showReceipt(delivery.id, false)}
                                trackingNumber={delivery.trackingNumber}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
        </PageColumns>
      </TabsContent>
    </Tabs>
  );
}

/**
 * Search by tracking number: the label for screen readers, "Search" sends it, "Clear" removes it. Spaces and case
 * don't matter (the API ignores them), so "sd 2611 0031" finds SD 2611 0031 52.
 */
function DeliverySearch({ q, onSearch }: { q: string; onSearch: (value: string) => void }) {
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(String(new FormData(event.currentTarget).get("q") ?? ""));
  }

  return (
    <form role="search" aria-label="Search your deliveries" onSubmit={onSubmit} className="w-full md:max-w-sm">
      <label htmlFor="delivery-search" className="sr-only">
        Tracking number
      </label>
      <div className="flex gap-2">
        <Input
          id="delivery-search"
          name="q"
          type="search"
          size="md"
          className="min-w-0 flex-1"
          defaultValue={q}
          maxLength={MAX_DELIVERY_SEARCH}
          placeholder="Search tracking number"
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" className="h-10 shrink-0">
          Search
        </Button>
        {q ? (
          <Button type="button" variant="secondary" className="h-10 shrink-0" onClick={() => onSearch("")}>
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** "Receipt" for one delivery; pressed while its receipt is the one in the preview. */
function ReceiptButton({
  selected,
  onClick,
  trackingNumber,
}: {
  selected: boolean;
  onClick: () => void;
  trackingNumber: string;
}) {
  return (
    <Button variant="link" aria-pressed={selected} onClick={onClick} className="whitespace-nowrap">
      Receipt
      <span className="sr-only"> for {formatTrackingNumber(trackingNumber)}</span>
    </Button>
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
