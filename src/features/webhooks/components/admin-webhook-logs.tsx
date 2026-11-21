"use client";

import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { adminWebhooksApi } from "../api";
import { type DeliveryLoader, useDeliveries } from "../hooks/use-deliveries";
import { useDeliveryFilters } from "../hooks/use-delivery-filters";
import { useMerchantNames } from "../hooks/use-merchant-names";
import { MAX_ATTEMPTS } from "../labels";
import type { AdminWebhookDelivery } from "../types";
import { DeliveryFilters } from "./delivery-filters";
import { DeliveryList, deliveriesEmptyTitle } from "./delivery-parts";

/**
 * Admin Webhook Logs (`/admin/webhooks`): every merchant's webhook deliveries, newest first, with the same search,
 * event, status and date filters as the merchant's history plus a merchant filter, and Retry on failed deliveries.
 */
export function AdminWebhookLogs() {
  const { filters, searchText, setSearchText, page, setPage, update, clear, filtered } = useDeliveryFilters();
  const [merchantId, setMerchantId] = React.useState("");
  const { merchants, nameOf } = useMerchantNames();

  const load = React.useCallback<DeliveryLoader<AdminWebhookDelivery>>(
    (query, signal) => adminWebhooksApi.deliveries({ ...query, merchantId: merchantId || undefined }, signal),
    [merchantId],
  );
  const deliveries = useDeliveries(`admin:${merchantId}`, load, filters, page);

  const anyFilter = filtered || merchantId !== "";

  function changeMerchant(value: string) {
    setMerchantId(value);
    setPage(0);
  }

  function clearAll() {
    clear();
    setMerchantId("");
  }

  const clearButton = anyFilter ? (
    <Button variant="tertiary" onClick={clearAll}>
      Clear filters
    </Button>
  ) : null;

  const merchantFilter = (
    <div className="sm:w-64">
      <label htmlFor="webhook-logs-merchant" className="sr-only">
        Merchant
      </label>
      <Select
        id="webhook-logs-merchant"
        size="md"
        value={merchantId}
        onChange={(event) => changeMerchant(event.target.value)}
      >
        <option value="">All merchants</option>
        {merchants.map((merchant) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.name}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <ListPage title="Webhook Logs" description="Every merchant's webhook deliveries and retries.">
      <Card aria-labelledby="webhook-logs-heading">
        <CardHeader
          title="Deliveries"
          titleId="webhook-logs-heading"
          description={
            deliveries.status === "ready"
              ? `${deliveries.data.totalElements} ${deliveries.data.totalElements === 1 ? "delivery" : "deliveries"}`
              : undefined
          }
        />

        <DeliveryFilters
          idPrefix="webhook-logs"
          filters={filters}
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onChange={update}
          clearButton={clearButton}
          extra={merchantFilter}
        />

        <DeliveryList
          deliveries={deliveries}
          audience="admin"
          leading={{ header: "Merchant", cell: (delivery) => nameOf(delivery.merchantId) }}
          emptyTitle={
            anyFilter ? deliveriesEmptyTitle(filters, true, merchantId !== "") : "No webhook deliveries yet"
          }
          emptyText={
            anyFilter
              ? "Try another merchant, search, event, status or dates, or clear the filters."
              : "Deliveries appear here when merchants' parcels change status or a merchant sends a test."
          }
          clearButton={clearButton}
          onRetry={adminWebhooksApi.retry}
          onPageChange={setPage}
        />

        <CardContent className="border-t border-grey-200">
          <p className="text-body-sm text-grey-600">
            When a merchant&apos;s server doesn&apos;t receive a message, we try again after 1 min, 5 min, 15 min,
            1 h and 6 h. After {MAX_ATTEMPTS} tries, or if the server clearly refuses the message, it&apos;s marked
            Failed. Retry sends it again with a new set of attempts. A test message is tried once.
          </p>
        </CardContent>
      </Card>
    </ListPage>
  );
}
