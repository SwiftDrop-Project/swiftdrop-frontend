"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { formatTrackingNumber } from "@/lib/format";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { courierApi } from "../api";
import { CONFLICT_TITLE, describeCourierError, NOT_FOUND_TITLE, UNAVAILABLE_TITLE } from "../lib/errors";
import { courierRoutes, isSimpleStep, STEP_ACTION_LABEL, STEP_WORDS } from "../lib/labels";
import { NOTE_MAX_LENGTH, optionalNote, statusStepSchema, type StatusStepValues } from "../schemas";
import type { CourierDeliveryDetail, SimpleStepStatus } from "../types";

/**
 * The buttons for what the courier may do next, taken only from `nextStatuses`:
 * - PICKED_UP / IN_TRANSIT / OUT_FOR_DELIVERY: a confirm dialog with an optional note
 * - DELIVERED / FAILED: links to their own forms (one primary button per view: "Mark as delivered")
 */
export function StatusActions({
  parcel,
  onUpdated,
  onConflict,
}: {
  parcel: CourierDeliveryDetail;
  /** The parcel as the status update returned it. */
  onUpdated: (parcel: CourierDeliveryDetail) => void;
  /** 409: the status changed elsewhere; reload the parcel. */
  onConflict: () => void;
}) {
  const simpleSteps = parcel.nextStatuses.filter(isSimpleStep);
  const canDeliver = parcel.nextStatuses.includes("DELIVERED");
  const canFail = parcel.nextStatuses.includes("FAILED");

  if (simpleSteps.length === 0 && !canDeliver && !canFail) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">
      {simpleSteps.map((step) => (
        <StepDialog key={step} parcel={parcel} step={step} onUpdated={onUpdated} onConflict={onConflict} />
      ))}
      {canDeliver ? (
        <Button asChild>
          <Link href={courierRoutes.delivered(parcel.parcelId)}>{STEP_ACTION_LABEL.DELIVERED}</Link>
        </Button>
      ) : null}
      {canFail ? (
        <Button asChild variant={canDeliver ? "secondary" : "primary"}>
          <Link href={courierRoutes.failed(parcel.parcelId)}>{STEP_ACTION_LABEL.FAILED}</Link>
        </Button>
      ) : null}
    </div>
  );
}

const STEP_DESCRIPTION: Record<SimpleStepStatus, (parcel: CourierDeliveryDetail) => string> = {
  PICKED_UP: (parcel) => `Do this once you have the parcel from ${parcel.pickup.name}. You can't undo it.`,
  IN_TRANSIT: (parcel) => `Do this when the parcel is on its way to ${parcel.recipient.city}. You can't undo it.`,
  OUT_FOR_DELIVERY: (parcel) =>
    `Do this when you set off to ${parcel.recipient.name} today. You can't undo it.`,
};

function StepDialog({
  parcel,
  step,
  onUpdated,
  onConflict,
}: {
  parcel: CourierDeliveryDetail;
  step: SimpleStepStatus;
  onUpdated: (parcel: CourierDeliveryDetail) => void;
  onConflict: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: "info" | "error"; title: string; body: string } | null>(null);
  const tracking = formatTrackingNumber(parcel.trackingNumber);
  const fieldId = `step-note-${step}`;

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StatusStepValues>({
    resolver: zodResolver(statusStepSchema),
    defaultValues: { note: "" },
  });

  function onOpenChange(next: boolean) {
    // Keep the dialog open while the update is being saved.
    if (isSubmitting) return;
    setOpen(next);
    if (!next) {
      reset();
      setNotice(null);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const updated = await courierApi.changeStatus(parcel.parcelId, { status: step, note: optionalNote(values.note) });
      setOpen(false);
      reset();
      onUpdated(updated);
      toast({ tone: "success", title: `${tracking} marked as ${STEP_WORDS[step]}` });
    } catch (error) {
      const described = describeCourierError(error);
      switch (described.kind) {
        case "conflict":
          setOpen(false);
          reset();
          toast({ tone: "error", title: CONFLICT_TITLE, description: described.message });
          onConflict();
          return;
        case "not-found":
          setOpen(false);
          toast({ tone: "error", title: NOT_FOUND_TITLE });
          router.replace(courierRoutes.today);
          return;
        case "validation": {
          if (isApiError(error)) {
            const { handled, unmatched } = applyServerFieldErrors(error, setError, ["note"]);
            if (handled && unmatched.length === 0) return;
            setNotice({ tone: "error", title: "We couldn't save this update", body: unmatched.join(" ") || described.message });
          }
          return;
        }
        case "unavailable":
          setNotice({ tone: "info", title: UNAVAILABLE_TITLE, body: described.message });
          return;
        default:
          setNotice({ tone: "error", title: "We couldn't save this update", body: described.message });
      }
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button>{STEP_ACTION_LABEL[step]}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark <span className="tabular-nums">{tracking}</span> as {STEP_WORDS[step]}?
            </AlertDialogTitle>
            <AlertDialogDescription>{STEP_DESCRIPTION[step](parcel)}</AlertDialogDescription>
          </AlertDialogHeader>

          {notice ? (
            <InlineNotice tone={notice.tone} title={notice.title}>
              {notice.body}
            </InlineNotice>
          ) : null}

          <FormField
            id={fieldId}
            label="Note"
            labelHint="(optional)"
            helper={`Up to ${NOTE_MAX_LENGTH} characters, e.g. "Collected from the front desk".`}
            error={errors.note?.message}
          >
            {(a11y) => <Textarea {...a11y} {...register("note")} rows={3} />}
          </FormField>

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <Button type="submit" loading={isSubmitting}>
              {STEP_ACTION_LABEL[step]}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
