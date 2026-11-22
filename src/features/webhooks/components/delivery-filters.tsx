"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DELIVERY_EVENT_TYPES, DELIVERY_STATUSES, DELIVERY_STATUS_LABEL, deliveryEventLabel } from "../labels";
import type { DeliveryEventType, DeliveryFilterValues, DeliveryStatus } from "../types";
import { FilterField } from "./delivery-parts";

/** Same limit as the backend. */
const MAX_SEARCH_LENGTH = 64;

/**
 * Search (tracking number, order number or an id) on its own line, then event, status, from and to (2 per row on
 * tablets, 4 on desktops, stacked on phones). `extra` sits next to the search box, e.g. the admin's merchant filter.
 */
export function DeliveryFilters({
  idPrefix,
  filters,
  searchText,
  onSearchTextChange,
  onChange,
  clearButton,
  extra,
}: {
  /** Keeps the field ids unique on the page. */
  idPrefix: string;
  filters: DeliveryFilterValues;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  onChange: (change: Partial<DeliveryFilterValues>) => void;
  /** Shown only while a filter is set. */
  clearButton: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-col gap-3 border-b border-grey-200 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor={id("search")} className="sr-only">
            Search deliveries
          </label>
          <Input
            id={id("search")}
            type="search"
            size="md"
            value={searchText}
            maxLength={MAX_SEARCH_LENGTH}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search tracking number, order number or ID"
            onChange={(event) => onSearchTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onChange({ search: searchText });
            }}
          />
        </div>
        {extra}
        {clearButton}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterField id={id("event")} label="Event">
          <Select
            id={id("event")}
            size="md"
            value={filters.eventType}
            onChange={(event) => onChange({ eventType: event.target.value as DeliveryEventType | "" })}
          >
            <option value="">All events</option>
            {DELIVERY_EVENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {deliveryEventLabel(value)}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField id={id("status")} label="Status">
          <Select
            id={id("status")}
            size="md"
            value={filters.status}
            onChange={(event) => onChange({ status: event.target.value as DeliveryStatus | "" })}
          >
            <option value="">All statuses</option>
            {DELIVERY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {DELIVERY_STATUS_LABEL[value]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField id={id("from")} label="From">
          <Input
            id={id("from")}
            type="date"
            size="md"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => onChange({ from: event.target.value })}
          />
        </FilterField>
        <FilterField id={id("to")} label="To">
          <Input
            id={id("to")}
            type="date"
            size="md"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => onChange({ to: event.target.value })}
          />
        </FilterField>
      </div>
    </div>
  );
}
