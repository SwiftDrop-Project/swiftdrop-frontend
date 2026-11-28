"use client";

import { CreditCard } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatRs, formatTrackingNumber } from "@/lib/format";
import { usePayments } from "../hooks/use-payments";
import { canPayByCard, methodLabel, statusBadge } from "../labels";
import type { Payment, PaymentSummary } from "../types";
import { PayByCardDialog } from "./pay-by-card-dialog";

const PAGE_SIZE = 20;

/**
 * /customer/payments: one payment for every delivery (GET /payments, newest booking first) with "Paid to date" and
 * "Due" on top (GET /payments/summary). Cash is paid to the courier (at pickup or on delivery) and turns Paid by
 * itself; an online delivery shows "Pay now", which opens the mock card form. Cards on phones, a table from md up.
 */
export function CustomerPayments() {
  const [page, setPage] = React.useState(0);
  const [paying, setPaying] = React.useState<Payment | null>(null);
  const { state, reload } = usePayments(page, PAGE_SIZE);

  if (state.status === "loading") return <LoadingPayments />;

  if (state.status === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-4 sm:p-6">
          <InlineNotice tone="error" title="We couldn't load your payments">
            {state.message}
          </InlineNotice>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, page: payments } = state;

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards summary={summary} />

      <Card aria-labelledby="payment-history">
        <CardContent className="p-0">
          <h2 id="payment-history" className="px-4 pt-5 text-h3 font-semibold text-grey-900 sm:px-6">
            Payment history
          </h2>

          {payments.totalElements === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                description="Every delivery you book gets a payment here, with how and when it was paid."
              />
            </div>
          ) : (
            <>
              {/* Phones: one card per payment */}
              <ul className="mt-3 divide-y divide-grey-100 md:hidden">
                {payments.content.map((payment) => (
                  <li key={payment.id} className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-label text-grey-900 tabular-nums">
                        {formatTrackingNumber(payment.trackingNumber)}
                      </p>
                      <StatusBadge payment={payment} />
                    </div>
                    <p className="text-body-sm text-grey-600">
                      <span className="tabular-nums">{formatDate(payment.bookedAt)}</span> · {methodLabel(payment)}
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-label text-grey-900 tabular-nums">{formatRs(payment.amount)}</p>
                      {canPayByCard(payment) ? <PayNow payment={payment} onPay={() => setPaying(payment)} /> : null}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Tablet and up: table */}
              <div className="mt-3 hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tracking number</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Action</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.content.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap text-grey-700 tabular-nums">
                          {formatDate(payment.bookedAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-label text-grey-900 tabular-nums">
                          {formatTrackingNumber(payment.trackingNumber)}
                        </TableCell>
                        <TableCell className="text-grey-700">{methodLabel(payment)}</TableCell>
                        <TableCell>
                          <StatusBadge payment={payment} />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-label text-grey-900 tabular-nums">
                          {formatRs(payment.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {canPayByCard(payment) ? (
                            <PayNow payment={payment} onPay={() => setPaying(payment)} />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                page={payments.page}
                totalPages={payments.totalPages}
                totalElements={payments.totalElements}
                size={payments.size}
                onPageChange={(next) => {
                  setPage(next);
                  window.scrollTo({ top: 0 });
                }}
                itemLabel="payments"
              />
            </>
          )}
        </CardContent>
      </Card>

      <PayByCardDialog
        payment={paying}
        onClose={() => setPaying(null)}
        onPaid={() => {
          setPaying(null);
          reload();
        }}
      />
    </div>
  );
}

/** "Paid to date" and "Due" (cash for the courier, and anything to pay online). */
function SummaryCards({ summary }: { summary: PaymentSummary }) {
  const onlyCash = summary.dueCount > 0 && summary.dueOnlineCount === 0;
  const dueNotes: string[] = [];
  if (summary.dueCashCount === 1 && summary.dueCashTrackingNumber) {
    dueNotes.push(`Cash to hand to the courier for ${formatTrackingNumber(summary.dueCashTrackingNumber)}`);
  } else if (summary.dueCashCount > 1) {
    dueNotes.push(`Cash to hand to the courier for ${summary.dueCashCount} deliveries`);
  }
  if (summary.dueOnlineCount > 0) {
    dueNotes.push(
      `${formatRs(summary.dueOnlineTotal)} to pay online for ${summary.dueOnlineCount} ${
        summary.dueOnlineCount === 1 ? "delivery" : "deliveries"
      }`,
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-1 p-5">
          <p className="text-body-sm text-grey-600">Paid to date</p>
          <p className="text-h1 font-semibold text-grey-900 tabular-nums">{formatRs(summary.paidTotal)}</p>
          <p className="text-body-sm text-grey-600">
            {summary.paidCount} completed {summary.paidCount === 1 ? "payment" : "payments"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-1 p-5">
          <p className="text-body-sm text-grey-600">{onlyCash ? "Due on delivery" : "Due"}</p>
          <p className="text-h1 font-semibold text-grey-900 tabular-nums">{formatRs(summary.dueTotal)}</p>
          {dueNotes.length > 0 ? (
            dueNotes.map((note) => (
              <p key={note} className="text-body-sm text-grey-600 tabular-nums">
                {note}
              </p>
            ))
          ) : (
            <p className="text-body-sm text-grey-600">Nothing to pay right now</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ payment }: { payment: Payment }) {
  const { label, tone } = statusBadge(payment);
  return (
    <Badge tone={tone} dot={false}>
      {label}
    </Badge>
  );
}

function PayNow({ payment, onPay }: { payment: Payment; onPay: () => void }) {
  return (
    <Button variant="secondary" onClick={onPay} className="whitespace-nowrap">
      Pay now
      <span className="sr-only"> for {formatTrackingNumber(payment.trackingNumber)}</span>
    </Button>
  );
}

function LoadingPayments() {
  return (
    <div aria-busy="true" aria-label="Loading your payments" className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((card) => (
          <Card key={card}>
            <CardContent className="flex flex-col gap-2 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="flex flex-col gap-3 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
