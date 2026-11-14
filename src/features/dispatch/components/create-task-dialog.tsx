"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import { dispatchApi } from "../api";
import { useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { ASSIGNMENT_TYPE_HELP, ASSIGNMENT_TYPE_LABEL } from "../labels";
import { createTaskSchema, type CreateTaskValues } from "../schemas";
import type { QueueParcel } from "../types";
import { CourierSelect, courierBranch } from "./courier-select";

/** Today in Sri Lanka as yyyy-mm-dd (the earliest date a task can be planned for). */
export function todayInColombo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date());
}

function subscribeToNothing() {
  return () => {};
}

/**
 * Creates one courier task for the selected parcels. They all need the same next step (same type and branches),
 * so the type and branches come from the parcels; the dispatcher picks the courier, the day and a note.
 */
export function CreateTaskDialog({
  parcels,
  open,
  onOpenChange,
  onCreated,
  openTask = true,
}: {
  parcels: QueueParcel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /** Go to the new task's page (/dispatcher/tasks/{id}) afterwards. Off for admins, who can't open it. */
  openTask?: boolean;
}) {
  const router = useRouter();
  const { name } = useDistrictName();
  const [notice, setNotice] = React.useState<string | null>(null);
  const first = parcels[0];
  const type = first?.suggestedType ?? "PICKUP";
  const origin = first?.suggestedOrigin ?? null;
  const destination = first?.suggestedDestination ?? null;
  const branch = courierBranch(type, origin, destination);
  const couriers = useLoad(open && branch ? `couriers:${branch}` : null, (signal) =>
    dispatchApi.workload(branch, signal),
  );

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
    try {
      const task = await dispatchApi.createAssignment({
        courierId: values.courierId,
        type,
        originBranch: origin,
        destinationBranch: destination,
        scheduledFor: values.scheduledFor,
        note: values.note || undefined,
        parcelIds: parcels.map((parcel) => parcel.parcelId),
      });
      toast({
        tone: "success",
        title: `${ASSIGNMENT_TYPE_LABEL[type]} task created`,
        description: `${task.courier.fullName ?? "The courier"} has ${parcels.length} ${
          parcels.length === 1 ? "parcel" : "parcels"
        } to handle.`,
      });
      handleOpenChange(false);
      onCreated();
      if (openTask) router.push(`/dispatcher/tasks/${task.id}`);
    } catch (error) {
      if (!isApiError(error)) {
        setNotice("Something went wrong. Try again in a moment.");
        return;
      }
      if (error.code === "VALIDATION_FAILED") {
        const { handled, unmatched } = applyServerFieldErrors(error, setError, ["courierId", "scheduledFor", "note"]);
        if (handled && unmatched.length === 0) return;
        setNotice(unmatched[0] ?? error.message);
        return;
      }
      if (error.code === "COURIER_NOT_ASSIGNABLE") {
        setError("courierId", { message: error.message });
        couriers.reload();
        return;
      }
      setNotice(error.message);
    }
  });

  const route =
    type === "PICKUP"
      ? `Hand over at ${name(destination)} branch`
      : type === "TRANSFER"
        ? `${name(origin)} branch → ${name(destination)} branch`
        : `From ${name(origin)} branch to the recipients`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create a {ASSIGNMENT_TYPE_LABEL[type].toLowerCase()} task</DialogTitle>
          <DialogDescription>{ASSIGNMENT_TYPE_HELP[type]}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogBody className="gap-5">
            {notice ? (
              <InlineNotice tone="error" title="We couldn't create the task">
                {notice}
              </InlineNotice>
            ) : null}

            <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
              <p className="text-label text-grey-900">{route}</p>
              <p className="mt-1 text-body-sm text-grey-600 tabular-nums">
                {parcels.length} {parcels.length === 1 ? "parcel" : "parcels"}:{" "}
                {parcels
                  .slice(0, 4)
                  .map((parcel) => formatTrackingNumber(parcel.trackingNumber))
                  .join(", ")}
                {parcels.length > 4 ? ` and ${parcels.length - 4} more` : ""}
              </p>
            </div>

            <FormField
              id="create-task-courier"
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

            <FormField id="create-task-date" label="Day" error={errors.scheduledFor?.message}>
              {(a11y) => (
                <Input {...a11y} {...register("scheduledFor")} type="date" size="md" min={today || undefined} />
              )}
            </FormField>

            <FormField
              id="create-task-note"
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
            <Button type="submit" loading={isSubmitting}>
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
