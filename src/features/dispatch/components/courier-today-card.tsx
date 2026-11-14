"use client";

import Link from "next/link";
import { MapPin, RotateCw, Truck } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { formatPhone, formatRs, formatTime, formatTrackingNumber, humanizeCode } from "@/lib/format";
import {
  COURIER_FAILURE_REASONS,
  courierApi,
  type CourierFailureReason,
  type CourierParcel,
  type CourierStatusChange,
} from "../courier-api";
import { useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { failureReasonLabel } from "../labels";
import type { DispatchParcelStatus } from "../types";
import { ParcelStatusBadge } from "./dispatch-badges";

/** Button text for each step the courier can take. */
const STEP_LABEL: Partial<Record<DispatchParcelStatus, string>> = {
  PICKED_UP: "Mark collected",
  IN_TRANSIT: "Mark loaded",
  OUT_FOR_DELIVERY: "Start delivery",
  DELIVERED: "Mark delivered",
  FAILED: "Delivery failed",
};

/** The parcels in the courier's dispatch tasks for today, in the order to do them, with their next step. */
export function CourierTodayCard() {
  const today = useLoad("courier-today", (signal) => courierApi.today(signal));

  if (today.status === "loading") {
    return (
      <Card className="p-6" aria-busy="true" aria-label="Loading today's parcels">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    );
  }

  if (today.status === "error") {
    return (
      <Card className="p-4 sm:p-6">
        <InlineNotice tone="error" title="We couldn't load your parcels">
          <p>{today.error}</p>
          <Button variant="secondary" className="mt-3" onClick={today.reload}>
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        </InlineNotice>
      </Card>
    );
  }

  const { items, toDo, done } = today.data;
  if (items.length === 0) {
    return (
      <Card className="p-6 sm:p-10">
        <EmptyState
          icon={Truck}
          size="lg"
          title="No parcels assigned for today"
          description="When the dispatcher assigns parcels to you, they will appear here with the pickup and delivery addresses."
          actions={
            <Button asChild>
              <Link href="/courier/history">View delivery history</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card aria-labelledby="courier-today-heading">
      <CardHeader
        title="Today's parcels"
        titleId="courier-today-heading"
        description={`${toDo} to do · ${done} done`}
        aside={
          <Button variant="secondary" onClick={today.reload}>
            <RotateCw aria-hidden="true" />
            Refresh
          </Button>
        }
      />
      <ul className="divide-y divide-grey-100">
        {items.map((parcel) => (
          <CourierParcelRow key={parcel.parcelId} parcel={parcel} onChanged={today.reload} />
        ))}
      </ul>
    </Card>
  );
}

function CourierParcelRow({ parcel, onChanged }: { parcel: CourierParcel; onChanged: () => void }) {
  const { name } = useDistrictName();
  const [pending, setPending] = React.useState(false);
  const [form, setForm] = React.useState<"DELIVERED" | "FAILED" | null>(null);
  const [recipientName, setRecipientName] = React.useState("");
  const [reason, setReason] = React.useState<CourierFailureReason>("RECIPIENT_UNAVAILABLE");
  const [note, setNote] = React.useState("");

  const goingTo = parcel.stop === "PICKUP" ? parcel.pickup : parcel.recipient;
  const finished = parcel.nextStatuses.length === 0;
  const branchName = parcel.task.branch ? name(parcel.task.branch) : "the branch";

  async function send(change: CourierStatusChange) {
    setPending(true);
    try {
      await courierApi.changeStatus(parcel.parcelId, change);
      toast({
        tone: "success",
        title: `${formatTrackingNumber(parcel.trackingNumber)} updated`,
      });
      setForm(null);
      onChanged();
    } catch (error) {
      toast({
        tone: "error",
        title: "We couldn't update the parcel",
        description: isApiError(error) ? error.message : "Try again in a moment.",
      });
      onChanged();
    } finally {
      setPending(false);
    }
  }

  function stepLabel(status: DispatchParcelStatus) {
    if (status === "AT_BRANCH") {
      return parcel.task.type === "DELIVERY" ? `Returned to ${branchName}` : `Handed over at ${branchName}`;
    }
    return STEP_LABEL[status] ?? humanizeCode(status);
  }

  const idBase = `parcel-${parcel.parcelId}`;

  return (
    <li className="flex flex-col gap-3 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label font-semibold text-grey-900 tabular-nums">
          {formatTrackingNumber(parcel.trackingNumber)}
        </span>
        <ParcelStatusBadge status={parcel.status} />
      </div>

      <div className="flex items-start gap-2 text-body-sm text-grey-700">
        <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-grey-500" />
        {parcel.task.type === "TRANSFER" ? (
          <div className="flex flex-col">
            <span className="text-grey-900">Take to {branchName} branch</span>
            <span className="text-grey-600">Assigned {formatTime(parcel.assignedAt)}</span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-grey-900">
              {parcel.stop === "PICKUP" ? "Collect from " : "Deliver to "}
              {goingTo.name} · {formatPhone(goingTo.phone)}
            </span>
            <span>
              {goingTo.address}, {goingTo.city}
            </span>
            <span className="text-grey-600">
              Assigned {formatTime(parcel.assignedAt)}
              {parcel.codAmount !== null ? ` · Collect ${formatRs(parcel.codAmount)}` : ""}
              {parcel.instructions ? ` · ${parcel.instructions}` : ""}
            </span>
          </div>
        )}
      </div>

      {finished ? (
        <p className="text-body-sm text-grey-600">Nothing more to do with this parcel.</p>
      ) : form === null ? (
        <div className="flex flex-wrap gap-2">
          {parcel.nextStatuses.map((status) => (
            <Button
              key={status}
              variant={status === "FAILED" ? "secondary" : "primary"}
              disabled={pending}
              onClick={() => (status === "DELIVERED" || status === "FAILED" ? setForm(status) : void send({ status }))}
            >
              {stepLabel(status)}
            </Button>
          ))}
        </div>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-md border border-grey-200 p-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (form === "DELIVERED") {
              if (recipientName.trim().length < 2) {
                toast({
                  tone: "error",
                  title: "Enter the name of the person who received the parcel.",
                });
                return;
              }
              void send({
                status: "DELIVERED",
                recipientName: recipientName.trim(),
              });
            } else {
              if (reason === "OTHER" && note.trim() === "") {
                toast({ tone: "error", title: "Describe what went wrong." });
                return;
              }
              void send({
                status: "FAILED",
                failureReason: reason,
                note: note.trim() || undefined,
              });
            }
          }}
        >
          {form === "DELIVERED" ? (
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`${idBase}-recipient`} className="text-label text-grey-900">
                Received by
              </label>
              <Input
                id={`${idBase}-recipient`}
                size="md"
                maxLength={100}
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor={`${idBase}-reason`} className="text-label text-grey-900">
                  Why did it fail?
                </label>
                <Select
                  id={`${idBase}-reason`}
                  size="md"
                  value={reason}
                  onChange={(event) => setReason(event.target.value as CourierFailureReason)}
                >
                  {COURIER_FAILURE_REASONS.map((code) => (
                    <option key={code} value={code}>
                      {failureReasonLabel(code)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor={`${idBase}-note`} className="text-label text-grey-900">
                  Note {reason === "OTHER" ? "" : "(optional)"}
                </label>
                <Input
                  id={`${idBase}-note`}
                  size="md"
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {form === "DELIVERED" ? "Confirm delivery" : "Confirm failure"}
            </Button>
            <Button type="button" variant="tertiary" disabled={pending} onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
