"use client";

import Link from "next/link";
import { Package, Plus } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { PARCEL_STATUS_LABEL, PARCEL_STATUSES, StatusBadge } from "@/components/ui/status-badge";
import { Stepper } from "@/components/ui/stepper";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline } from "@/components/ui/timeline";
import { formatDate, formatRs, formatTrackingNumber } from "@/lib/format";
import type { ParcelStatus } from "@/types";
import { Example, ExampleGrid, Section } from "./gallery-parts";

const ROWS: { tracking: string; recipient: string; district: string; status: ParcelStatus; amount: number; created: string }[] = [
  { tracking: "SD2611004817", recipient: "Nimal Perera", district: "Kandy", status: "IN_TRANSIT", amount: 450, created: "2026-11-02T04:30:00Z" },
  { tracking: "SD2611004818", recipient: "Kumari Silva", district: "Galle", status: "DELIVERED", amount: 2450, created: "2026-11-01T09:12:00Z" },
  { tracking: "SD2611004819", recipient: "Ruwan Jayasinghe", district: "Colombo", status: "CREATED", amount: 350, created: "2026-11-03T02:05:00Z" },
  { tracking: "SD2611004820", recipient: "Fathima Rizwan", district: "Jaffna", status: "FAILED", amount: 1250, created: "2026-10-30T11:45:00Z" },
];

const COLUMNS = 5;

function DeliveriesTable({ state }: { state: "data" | "loading" | "empty" }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tracking number</TableHead>
          <TableHead>Recipient</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {state === "loading" ? <TableLoading columns={COLUMNS} label="Loading deliveries" /> : null}
        {state === "empty" ? (
          <TableEmpty
            columns={COLUMNS}
            icon={Package}
            title="No deliveries yet"
            description="Deliveries you create will be listed here with their latest status."
            action={
              <Button asChild>
                <Link href="/dev/ui#table">
                  <Plus aria-hidden="true" />
                  Create delivery
                </Link>
              </Button>
            }
          />
        ) : null}
        {state === "data"
          ? ROWS.map((row) => (
              <TableRow key={row.tracking}>
                <TableCell className="text-label whitespace-nowrap tabular-nums">{formatTrackingNumber(row.tracking)}</TableCell>
                <TableCell>
                  <p>{row.recipient}</p>
                  <p className="text-grey-600">{row.district}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRs(row.amount)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDate(row.created)}</TableCell>
              </TableRow>
            ))
          : null}
      </TableBody>
    </Table>
  );
}

export function DataDisplay() {
  const [page, setPage] = React.useState(1);

  return (
    <>
      <Section
        id="status-badge"
        title="StatusBadge and Badge"
        description="Parcel status is always dot + word, so it reads without colour. Orange is never used for status: Badge has no orange tone."
      >
        <Example label="Every parcel status">
          {PARCEL_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </Example>
        <Example label="Badge tones (for other states, e.g. merchant approval)">
          <Badge tone="outline">Pending</Badge>
          <Badge tone="neutral">Inactive</Badge>
          <Badge tone="success">Approved</Badge>
          <Badge tone="error">Rejected</Badge>
          <Badge tone="neutral" dot={false}>
            COD
          </Badge>
        </Example>
      </Section>

      <Section
        id="card"
        title="Card"
        description="White panel, 1px grey-200 border, 8px radius, no shadow. CardHeader for lists and tables; CardContent for padded content."
      >
        <ExampleGrid columns={2}>
          <Example label="Padded content" stack>
            <Card className="p-6">
              <h3 className="text-h3 text-grey-900">Recipient</h3>
              <p className="mt-1 text-body-sm text-grey-600">Nimal Perera · +94 77 123 4567</p>
            </Card>
          </Example>
          <Example label="With header" stack>
            <Card aria-labelledby="g-card-title">
              <CardHeader
                titleId="g-card-title"
                title="Waiting for approval"
                aside={<p className="text-label text-grey-600 tabular-nums">3 applications</p>}
              />
              <CardContent>
                <p className="text-body-sm text-grey-600">Rows go here.</p>
              </CardContent>
            </Card>
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="table"
        title="Table"
        description="Inside a Card. Loading shows skeleton rows; empty shows an EmptyState in one full-width row. Amounts and numbers right-aligned with tabular-nums."
      >
        <Example label="With data" stack>
          <Card>
            <DeliveriesTable state="data" />
            <Pagination page={page} totalPages={7} totalElements={134} size={20} onPageChange={setPage} itemLabel="deliveries" />
          </Card>
        </Example>
        <ExampleGrid columns={2}>
          <Example label="Loading" stack>
            <Card>
              <DeliveriesTable state="loading" />
            </Card>
          </Example>
          <Example label="Empty" stack>
            <Card>
              <DeliveriesTable state="empty" />
            </Card>
          </Example>
        </ExampleGrid>
      </Section>

      <Section
        id="pagination"
        title="Pagination"
        description={
          <>
            Under a list, inside its Card. <code>page</code> is 0-based like the API&apos;s PageResponse. Pass{" "}
            <code>onPageChange</code>, or <code>getHref</code> for pages driven by the URL.
          </>
        }
      >
        <Example label="First page" stack>
          <Card>
            <Pagination page={0} totalPages={7} totalElements={134} size={20} getHref={(p) => `/dev/ui?page=${p}#pagination`} />
          </Card>
        </Example>
        <Example label="Middle page" stack>
          <Card>
            <Pagination page={3} totalPages={7} totalElements={134} size={20} getHref={(p) => `/dev/ui?page=${p}#pagination`} />
          </Card>
        </Example>
        <Example label="Last page" stack>
          <Card>
            <Pagination page={6} totalPages={7} totalElements={134} size={20} getHref={(p) => `/dev/ui?page=${p}#pagination`} />
          </Card>
        </Example>
      </Section>

      <Section
        id="tabs"
        title="Tabs"
        description="Switch between views of the same thing. Active tab: grey-900 label with an orange-600 underline. Scrolls sideways on phones."
      >
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="proof" disabled>
              Proof of delivery
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <p className="text-body text-grey-700">Pickup, recipient and parcel details.</p>
          </TabsContent>
          <TabsContent value="history">
            <p className="text-body text-grey-700">Every status change, newest first.</p>
          </TabsContent>
          <TabsContent value="payment">
            <p className="text-body text-grey-700">Delivery fee and cash on delivery.</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section
        id="stepper"
        title="Stepper"
        description="Progress through a form split into steps. Vertical on phones, horizontal from 640px."
      >
        {[0, 2, 4].map((current) => (
          <Example key={current} label={current === 0 ? "First step" : current === 4 ? "All done" : "Third step"} stack>
            <Stepper
              current={current}
              steps={[
                { label: "Pickup", description: "Where we collect it" },
                { label: "Recipient", description: "Who gets it" },
                { label: "Parcel", description: "Weight and size" },
                { label: "Review", description: "Price and confirm" },
              ]}
            />
          </Example>
        ))}
      </Section>

      <Section
        id="timeline"
        title="Timeline"
        description="A parcel's history, newest first, in Sri Lankan time. The newest event has a dark dot; success and error only for the final outcome."
      >
        <ExampleGrid columns={2}>
          <Example label="In progress" stack>
            <Timeline
              items={[
                { id: "4", title: PARCEL_STATUS_LABEL.OUT_FOR_DELIVERY, description: "With rider Kasun, Kandy", timestamp: "2026-11-03T03:10:00Z" },
                { id: "3", title: PARCEL_STATUS_LABEL.IN_TRANSIT, description: "Left the Colombo branch", timestamp: "2026-11-02T11:40:00Z" },
                { id: "2", title: PARCEL_STATUS_LABEL.PICKED_UP, description: "Collected from Nugegoda", timestamp: "2026-11-02T05:15:00Z" },
                { id: "1", title: PARCEL_STATUS_LABEL.CREATED, timestamp: "2026-11-02T03:30:00Z" },
              ]}
            />
          </Example>
          <Example label="Delivered" stack>
            <Timeline
              items={[
                { id: "3", title: PARCEL_STATUS_LABEL.DELIVERED, description: "Signed by K. Silva", timestamp: "2026-11-01T09:12:00Z", tone: "success" },
                { id: "2", title: PARCEL_STATUS_LABEL.OUT_FOR_DELIVERY, timestamp: "2026-11-01T04:00:00Z" },
                { id: "1", title: PARCEL_STATUS_LABEL.CREATED, timestamp: "2026-10-31T10:00:00Z" },
              ]}
            />
          </Example>
        </ExampleGrid>
      </Section>
    </>
  );
}
