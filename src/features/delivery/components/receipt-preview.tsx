"use client";

import { Download, ReceiptText } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRs, formatTrackingNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deliveryApi } from "../api";
import { useReceipt } from "../hooks/use-deliveries";
import { PAYMENT_METHOD_LABEL, sizeText } from "../labels";
import type { DeliveryReceipt } from "../types";

/**
 * "Receipt preview" beside My deliveries: the chosen delivery's receipt (GET /deliveries/{id}/receipt) and
 * "Download PDF", a plain link to GET /deliveries/{id}/receipt/pdf that the browser downloads with the login cookie.
 */
export function ReceiptPreview({ deliveryId }: { deliveryId: string | null }) {
  const { state, retry } = useReceipt(deliveryId);
  const titleId = React.useId();

  return (
    <Card aria-labelledby={titleId} className="scroll-mt-6" id="receipt-preview">
      <CardContent className="flex flex-col gap-4">
        <h2 id={titleId} className="text-h3 text-grey-900">
          Receipt preview
        </h2>

        {deliveryId === null ? (
          <EmptyState
            icon={ReceiptText}
            headingLevel="h3"
            title="No receipt to show"
            description="Choose a delivery to see its receipt."
          />
        ) : state.status === "loading" ? (
          <ReceiptSkeleton />
        ) : state.status === "error" ? (
          <div className="flex flex-col items-start gap-4">
            <InlineNotice tone="error" title="We couldn't load this receipt">
              {state.message}
            </InlineNotice>
            <Button variant="secondary" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <ReceiptDocument receipt={state.data} />
            <Button asChild className="w-full">
              <a href={deliveryApi.receiptPdfUrl(deliveryId)} download>
                <Download aria-hidden="true" />
                Download PDF
              </a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** The receipt itself, laid out like the PDF. */
function ReceiptDocument({ receipt }: { receipt: DeliveryReceipt }) {
  const parcel = [
    `${receipt.weightKg} kg`,
    receipt.size ? sizeText({ ...receipt.size, keepUpright: false }) : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-dashed border-grey-300 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-h3 text-grey-900">SwiftDrop</p>
        <p className="text-caption font-medium text-grey-700">Delivery receipt</p>
      </div>

      <dl className="flex flex-col gap-3 text-body-sm">
        <Row label="Tracking number" value={formatTrackingNumber(receipt.trackingNumber)} strong tabular />
        <Row label="Booked" value={formatDate(receipt.bookedAt)} strong tabular />
        <Stacked label="Pickup" value={`${receipt.pickup.addressLine}, ${receipt.pickup.city}`} />
        <Stacked label="Drop-off" value={`${receipt.recipient.addressLine}, ${receipt.recipient.city}`} />
        <Row label="Parcel" value={parcel.join(" · ")} tabular />
      </dl>

      <dl className="flex flex-col gap-2 border-t border-grey-200 pt-4 text-body-sm">
        {receipt.lines.map((line) => (
          <Row key={`${line.component}-${line.label}`} label={line.label} value={formatRs(line.amount)} tabular />
        ))}
        <div className="flex items-baseline justify-between gap-4 pt-1">
          <dt className="text-label text-grey-900">Total</dt>
          <dd className="text-h3 text-grey-900 tabular-nums">{formatRs(receipt.total)}</dd>
        </div>
      </dl>

      {receipt.paymentMethod ? (
        <div className="flex items-center justify-between gap-3 text-body-sm">
          <p className="text-grey-700">{PAYMENT_METHOD_LABEL[receipt.paymentMethod]}</p>
          {receipt.paymentStatus === "PAID" ? <Badge tone="neutral">Paid</Badge> : null}
          {receipt.paymentStatus === "DUE" ? <Badge tone="outline">Due</Badge> : null}
        </div>
      ) : null}

      {receipt.codAmount !== null ? (
        <p className="text-body-sm text-grey-600">
          Cash on delivery: <span className="tabular-nums">{formatRs(receipt.codAmount)}</span>, collected from the
          recipient for you. Not part of the fee.
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
  tabular = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-grey-600">{label}</dt>
      <dd
        className={cn(
          "text-right",
          strong ? "font-semibold whitespace-nowrap text-grey-900" : "text-grey-800",
          tabular && "tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Stacked({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-grey-600">{label}</dt>
      <dd className="wrap-break-word text-grey-900">{value}</dd>
    </div>
  );
}

function ReceiptSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the receipt" className="flex flex-col gap-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
