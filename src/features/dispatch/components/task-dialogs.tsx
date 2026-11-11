"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api";
import { formatTrackingNumber } from "@/lib/format";
import { dispatchApi } from "../api";
import { useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { reassignSchema, type ReassignValues } from "../schemas";
import type { AssignmentDetail } from "../types";
import { CourierSelect, courierBranch } from "./courier-select";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : UNKNOWN_ERROR;
}

/* ---------------------------------------------------------------- Change courier */

export function ReassignDialog({
  task,
  open,
  onOpenChange,
  onDone,
}: {
  task: AssignmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (task: AssignmentDetail) => void;
}) {
  const { name } = useDistrictName();
  const [notice, setNotice] = React.useState<string | null>(null);
  const branch = courierBranch(task.type, task.originBranch, task.destinationBranch);
  const couriers = useLoad(open && branch ? `couriers:${branch}` : null, (signal) =>
    dispatchApi.workload(branch, signal),
  );
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReassignValues>({ resolver: zodResolver(reassignSchema), defaultValues: { courierId: "" } });

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setNotice(null);
    }
    onOpenChange(next);
  }

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const updated = await dispatchApi.reassign(task.id, values.courierId);
      handleOpenChange(false);
      onDone(updated);
    } catch (error) {
      if (isApiError(error) && error.code === "COURIER_NOT_ASSIGNABLE") {
        setError("courierId", { message: error.message });
        couriers.reload();
        return;
      }
      setNotice(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give this task to another courier?</DialogTitle>
          <DialogDescription>
            {task.courier.fullName ?? "The courier"} hasn&apos;t started it yet, so another courier can take it over.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogBody>
            {notice ? (
              <InlineNotice tone="error" title="We couldn't change the courier">
                {notice}
              </InlineNotice>
            ) : null}
            <FormField
              id="reassign-courier"
              label="New courier"
              error={errors.courierId?.message ?? (couriers.status === "error" ? couriers.error : undefined)}
            >
              {(a11y) => (
                <CourierSelect
                  {...a11y}
                  {...register("courierId")}
                  couriers={couriers.data}
                  loading={couriers.status === "loading"}
                  branchName={name(branch)}
                  excludeId={task.courier.id}
                />
              )}
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Keep courier
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Change courier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Cancel task */

export function CancelTaskDialog({
  task,
  open,
  onOpenChange,
  onDone,
}: {
  task: AssignmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (task: AssignmentDetail) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await dispatchApi.cancel(task.id);
      onOpenChange(false);
      onDone(updated);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNotice(null);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this task?</AlertDialogTitle>
          <AlertDialogDescription>
            {task.items.length === 1 ? "Its parcel goes" : `Its ${task.items.length} parcels go`} back to the
            unassigned parcels, so you can give {task.items.length === 1 ? "it" : "them"} to another courier.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {notice ? (
          <InlineNotice tone="error" title="We couldn't cancel the task">
            {notice}
          </InlineNotice>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary" disabled={busy}>
              Keep task
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="danger"
              loading={busy}
              onClick={(event) => {
                event.preventDefault();
                void confirm();
              }}
            >
              Cancel task
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------------------------------------------------------------- Add parcels */

/** Parcels in the queue that need exactly this task's step, so they can join it. */
export function AddParcelsDialog({
  task,
  open,
  onOpenChange,
  onDone,
}: {
  task: AssignmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (task: AssignmentDetail) => void;
}) {
  const { name } = useDistrictName();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const branch = courierBranch(task.type, task.originBranch, task.destinationBranch);
  const kind = task.type === "PICKUP" ? "PICKUP" : "AT_BRANCH";
  const queue = useLoad(open && branch ? `add:${branch}:${kind}` : null, (signal) =>
    dispatchApi.queue(branch, kind, signal),
  );
  const room = 50 - task.items.length;
  const candidates = (queue.data ?? []).filter(
    (parcel) =>
      parcel.suggestedType === task.type &&
      (parcel.suggestedOrigin ?? null) === task.originBranch &&
      (parcel.suggestedDestination ?? null) === task.destinationBranch,
  );

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelected(new Set());
      setNotice(null);
    }
    onOpenChange(next);
  }

  function toggle(parcelId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(parcelId);
      else next.delete(parcelId);
      return next;
    });
  }

  async function submit() {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await dispatchApi.addParcels(task.id, [...selected]);
      handleOpenChange(false);
      onDone(updated);
    } catch (error) {
      setNotice(errorMessage(error));
      queue.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add parcels to this task</DialogTitle>
          <DialogDescription>
            Parcels at {name(branch)} that need the same step. The task can take {room} more.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="gap-4">
          {notice ? (
            <InlineNotice tone="error" title="We couldn't add the parcels">
              {notice}
            </InlineNotice>
          ) : null}
          {queue.status === "loading" ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : queue.status === "error" ? (
            <InlineNotice tone="error" title="We couldn't load the parcels">
              {queue.error}
            </InlineNotice>
          ) : candidates.length === 0 ? (
            <InlineNotice title="No parcels need this step right now">
              New parcels for this route appear in the unassigned parcels.
            </InlineNotice>
          ) : (
            <ul className="flex max-h-80 flex-col divide-y divide-grey-100 overflow-y-auto rounded-lg border border-grey-200">
              {candidates.map((parcel) => {
                const id = `add-${parcel.parcelId}`;
                return (
                  <li key={parcel.parcelId} className="flex items-center gap-3 px-4 py-3">
                    <Checkbox
                      id={id}
                      checked={selected.has(parcel.parcelId)}
                      onCheckedChange={(checked) => toggle(parcel.parcelId, checked === true)}
                    />
                    <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col">
                      <span className="text-label text-grey-900 tabular-nums">
                        {formatTrackingNumber(parcel.trackingNumber)}
                      </span>
                      <span className="text-body-sm text-grey-600">
                        {parcel.from.city} → {parcel.to.city}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={selected.size === 0 || selected.size > room}>
            {selected.size > 0 ? `Add ${selected.size} ${selected.size === 1 ? "parcel" : "parcels"}` : "Add parcels"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
