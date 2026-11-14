"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { formatTrackingNumber } from "@/lib/format";
import type { DistrictCode } from "@/types";
import { dispatchApi } from "../api";
import { useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { createTaskSchema, type CreateTaskValues } from "../schemas";
import type { AssignmentType, QueueParcel } from "../types";
import { CourierSelect } from "./courier-select";

/** Today in Sri Lanka as yyyy-mm-dd (the earliest day parcels can be assigned for). */
export function todayInColombo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

function subscribeToNothing() {
  return () => {};
}

/** The backend holds at most this many parcels per task. */
const MAX_PARCELS_PER_TASK = 50;

interface Batch {
  type: AssignmentType;
  originBranch: DistrictCode | null;
  destinationBranch: DistrictCode | null;
  parcels: QueueParcel[];
}

/**
 * The backend keeps a courier's parcels in tasks: one next step between the same branches, up to 50 parcels. The
 * dispatcher never sees that: the parcels are split here, and every batch goes to the same courier.
 */
function batches(parcels: QueueParcel[]): Batch[] {
  const byStep = new Map<string, Batch>();
  for (const parcel of parcels) {
    const key = `${parcel.suggestedType}:${parcel.suggestedOrigin ?? ""}:${parcel.suggestedDestination ?? ""}`;
    const batch = byStep.get(key) ?? {
      type: parcel.suggestedType,
      originBranch: parcel.suggestedOrigin,
      destinationBranch: parcel.suggestedDestination,
      parcels: [],
    };
    batch.parcels.push(parcel);
    byStep.set(key, batch);
  }
  return [...byStep.values()].flatMap((batch) => {
    const chunks: Batch[] = [];
    for (let start = 0; start < batch.parcels.length; start += MAX_PARCELS_PER_TASK) {
      chunks.push({ ...batch, parcels: batch.parcels.slice(start, start + MAX_PARCELS_PER_TASK) });
    }
    return chunks;
  });
}

function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

/** Someone assigned a selected parcel meanwhile (another tab or dispatcher), or its status changed. */
const TAKEN_CODES = new Set(["PARCEL_ALREADY_ASSIGNED", "PARCEL_NOT_READY_FOR_TASK"]);
const TAKEN_MESSAGE =
  "A parcel you selected was already given to a courier or has changed, maybe from another screen. " +
  "It's been taken off the list.";

/** Assigns the selected parcels (any mix of pickups, transfers and deliveries at one branch) to one courier. */
export function AssignParcelsDialog({
  parcels,
  branch,
  open,
  onOpenChange,
  onAssigned,
}: {
  parcels: QueueParcel[];
  /** The branch whose queue the parcels come from; its couriers are offered. */
  branch: DistrictCode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when at least one parcel was assigned (reload the queue). */
  onAssigned: () => void;
}) {
  const { name } = useDistrictName();
  const [notice, setNotice] = React.useState<string | null>(null);
  const couriers = useLoad(open ? `couriers:${branch}` : null, (signal) => dispatchApi.workload(branch, signal));

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { courierId: "", scheduledFor: "", note: "" },
  });

  // Today is read when the dialog opens, not while the page renders (the page is prerendered).
  const today = React.useSyncExternalStore(subscribeToNothing, todayInColombo, () => "");
  React.useEffect(() => {
    if (open) reset({ courierId: "", scheduledFor: todayInColombo(), note: "" });
  }, [open, reset]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset({ courierId: "", scheduledFor: "", note: "" });
      setNotice(null);
    }
    onOpenChange(nextOpen);
  }

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    let assigned = 0;
    for (const batch of batches(parcels)) {
      try {
        await dispatchApi.createAssignment({
          courierId: values.courierId,
          type: batch.type,
          originBranch: batch.originBranch,
          destinationBranch: batch.destinationBranch,
          scheduledFor: values.scheduledFor,
          note: values.note || undefined,
          parcelIds: batch.parcels.map((parcel) => parcel.parcelId),
        });
        assigned += batch.parcels.length;
      } catch (error) {
        const taken = isApiError(error) && TAKEN_CODES.has(error.code);
        // Reloading the queue drops the taken parcel from the selection, so the rest can be assigned again.
        if (assigned > 0 || taken) onAssigned();
        if (taken) {
          setNotice(
            assigned > 0
              ? `${plural(assigned, "parcel")} were assigned. ${TAKEN_MESSAGE} Assign the rest again.`
              : `${TAKEN_MESSAGE} Check the parcels below and assign again.`,
          );
          return;
        }
        if (!isApiError(error)) {
          setNotice("Something went wrong. Try again in a moment.");
        } else if (error.code === "VALIDATION_FAILED") {
          const { handled, unmatched } = applyServerFieldErrors(error, setError, ["courierId", "scheduledFor", "note"]);
          if (!handled || unmatched.length > 0) setNotice(unmatched[0] ?? error.message);
        } else if (error.code === "COURIER_NOT_ASSIGNABLE") {
          setError("courierId", { message: error.message });
          couriers.reload();
        } else {
          setNotice(error.message);
        }
        if (assigned > 0) {
          setNotice(
            `${plural(assigned, "parcel")} were assigned before this happened: ${
              isApiError(error) ? error.message : "something went wrong"
            } Close this and select the rest again.`,
          );
        }
        return;
      }
    }
    const courier = couriers.data?.find((candidate) => candidate.courierId === values.courierId);
    toast({
      tone: "success",
      title: `${plural(assigned, "parcel")} assigned`,
      description: `${courier?.fullName ?? "The courier"} can see ${assigned === 1 ? "it" : "them"} now.`,
    });
    handleOpenChange(false);
    onAssigned();
  });

  const counts = {
    PICKUP: parcels.filter((parcel) => parcel.suggestedType === "PICKUP").length,
    TRANSFER: parcels.filter((parcel) => parcel.suggestedType === "TRANSFER").length,
    DELIVERY: parcels.filter((parcel) => parcel.suggestedType === "DELIVERY").length,
  };
  const summary = [
    counts.PICKUP ? `${counts.PICKUP} to collect` : null,
    counts.TRANSFER ? `${counts.TRANSFER} to take to another branch` : null,
    counts.DELIVERY ? `${counts.DELIVERY} to deliver` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            Assign {parcels.length > 0 ? plural(parcels.length, "parcel") : "parcels"} to a courier
          </DialogTitle>
          <DialogDescription>The courier sees each parcel on their Today page with what to do next.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogBody className="gap-5">
            {notice ? (
              <InlineNotice tone="error" title="We couldn't assign every parcel">
                {notice}
              </InlineNotice>
            ) : null}

            <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
              <p className="text-label text-grey-900">
                {parcels.length > 0 ? summary : "None of the selected parcels are waiting any more."}
              </p>
              <p className="mt-1 text-body-sm text-grey-600 tabular-nums">
                {parcels
                  .slice(0, 4)
                  .map((parcel) => formatTrackingNumber(parcel.trackingNumber))
                  .join(", ")}
                {parcels.length > 4 ? ` and ${parcels.length - 4} more` : ""}
              </p>
            </div>

            <FormField
              id="assign-parcels-courier"
              label="Courier"
              helper={`Active couriers at ${name(branch)} branch, least busy first.`}
              error={errors.courierId?.message ?? (couriers.status === "error" ? couriers.error : undefined)}
            >
              {(a11y) => (
                <CourierSelect
                  {...a11y}
                  {...register("courierId")}
                  couriers={couriers.data}
                  loading={couriers.status === "loading"}
                  branchName={name(branch)}
                />
              )}
            </FormField>

            <FormField id="assign-parcels-date" label="Day" error={errors.scheduledFor?.message}>
              {(a11y) => (
                <Input {...a11y} {...register("scheduledFor")} type="date" size="md" min={today || undefined} />
              )}
            </FormField>

            <FormField
              id="assign-parcels-note"
              label="Note to the courier"
              labelHint="(optional)"
              error={errors.note?.message}
            >
              {(a11y) => (
                <Textarea {...a11y} {...register("note")} rows={3} placeholder="e.g. Fragile parcels, load them last" />
              )}
            </FormField>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={parcels.length === 0}>
              Assign {plural(parcels.length, "parcel")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
