"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { webhooksApi } from "../api";
import { type DeliveryLoader, useDeliveries } from "../hooks/use-deliveries";
import { useDeliveryFilters } from "../hooks/use-delivery-filters";
import { MAX_ATTEMPTS } from "../labels";
import type { WebhookDelivery } from "../types";
import { DeliveryFilters } from "./delivery-filters";
import { DeliveryList, deliveriesEmptyTitle } from "./delivery-parts";

/**
 * The delivery history of one webhook, newest first: search (tracking number, order number or an id), event,
 * status and date filters, pages of 20, Retry on failed deliveries. Any filter change starts again at page 1.
 * `refreshSignal` changes when the parent queued something (e.g. "Send test"), so the list loads again.
 */
export function DeliveryHistory({ webhookId, refreshSignal }: { webhookId: string; refreshSignal: number }) {
  const { filters, searchText, setSearchText, page, setPage, update, clear, filtered } = useDeliveryFilters();
  const load = React.useCallback<DeliveryLoader<WebhookDelivery>>(
    (query, signal) => webhooksApi.deliveries(webhookId, query, signal),
    [webhookId],
  );
  const deliveries = useDeliveries(webhookId, load, filters, page);
  const { reload } = deliveries;

  React.useEffect(() => {
    if (refreshSignal > 0) reload();
  }, [refreshSignal, reload]);

  const clearButton = filtered ? (
    <Button variant="tertiary" onClick={clear}>
      Clear filters
    </Button>
  ) : null;

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

      <DeliveryFilters
        idPrefix="deliveries"
        filters={filters}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onChange={update}
        clearButton={clearButton}
      />

      <DeliveryList
        deliveries={deliveries}
        audience="merchant"
        emptyTitle={deliveriesEmptyTitle(filters, filtered)}
        emptyText={
          filtered
            ? "Try another search, event, status or dates, or clear the filters."
            : "Send a test to check your endpoint. Parcel events appear here as your orders move."
        }
        clearButton={clearButton}
        onRetry={webhooksApi.retry}
        onPageChange={setPage}
      />

      <CardContent className="border-t border-grey-200">
        <p className="text-body-sm text-grey-600">
          If your server doesn&apos;t receive a message, we try again after 1 min, 5 min, 15 min, 1 h and 6 h. After{" "}
          {MAX_ATTEMPTS} tries, or if your server clearly refuses the message, it&apos;s marked Failed and you can
          send it again here (10 seconds after its last try). A test message is tried once.
        </p>
      </CardContent>
    </Card>
  );
}
