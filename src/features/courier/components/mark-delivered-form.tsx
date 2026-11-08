"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { FormActions, FormSection } from "@/components/layout/form-page";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { formatRs, formatTrackingNumber } from "@/lib/format";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { courierApi } from "../api";
import { useStatusSubmitError } from "../hooks/use-status-submit-error";
import { courierRoutes, STEP_ACTION_LABEL } from "../lib/labels";
import { markDeliveredSchema, NOTE_MAX_LENGTH, optionalNote, type MarkDeliveredValues } from "../schemas";
import type { CourierDeliveryDetail } from "../types";
import { StatusFormPage } from "./status-form-page";

/** /courier/deliveries/[parcelId]/delivered: who received the parcel, then DELIVERED. */
export function MarkDeliveredForm({ parcelId }: { parcelId: string }) {
  return (
    <StatusFormPage parcelId={parcelId} target="DELIVERED" title={STEP_ACTION_LABEL.DELIVERED}>
      {(parcel) => <DeliveredForm parcel={parcel} />}
    </StatusFormPage>
  );
}

function DeliveredForm({ parcel }: { parcel: CourierDeliveryDetail }) {
  const router = useRouter();
  const { notice, setNotice, handleError } = useStatusSubmitError(parcel.parcelId);
  // Stays true after a successful save so the button keeps spinning until the page changes.
  const [leaving, setLeaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MarkDeliveredValues>({
    resolver: zodResolver(markDeliveredSchema),
    defaultValues: { recipientName: "", note: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      await courierApi.changeStatus(parcel.parcelId, {
        status: "DELIVERED",
        recipientName: values.recipientName,
        note: optionalNote(values.note),
      });
      setLeaving(true);
      toast({ tone: "success", title: `${formatTrackingNumber(parcel.trackingNumber)} delivered` });
      router.replace(courierRoutes.today);
    } catch (error) {
      handleError(error, (apiError) => applyServerFieldErrors(apiError, setError, ["recipientName", "note"]));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-12">
      {notice ? (
        <InlineNotice tone={notice.tone} title={notice.title}>
          {notice.body}
        </InlineNotice>
      ) : null}

      {parcel.codAmount !== null ? (
        <InlineNotice title={`Collect ${formatRs(parcel.codAmount)} in cash`}>
          Take the cash before you hand over the parcel.
        </InlineNotice>
      ) : null}

      <FormSection title="Proof of delivery" description="Who you handed the parcel to.">
        <FormField
          id="recipientName"
          label="Received by"
          helper={`The name on the label is ${parcel.recipient.name}.`}
          error={errors.recipientName?.message}
        >
          {(a11y) => <Input {...a11y} {...register("recipientName")} autoComplete="off" />}
        </FormField>

        <FormField
          id="note"
          label="Note"
          labelHint="(optional)"
          helper={`Up to ${NOTE_MAX_LENGTH} characters, e.g. "Left with the security guard".`}
          error={errors.note?.message}
        >
          {(a11y) => <Textarea {...a11y} {...register("note")} rows={3} />}
        </FormField>
      </FormSection>

      <FormActions>
        <Button type="submit" loading={isSubmitting || leaving}>
          {STEP_ACTION_LABEL.DELIVERED}
        </Button>
        <Button asChild variant="secondary">
          <Link href={courierRoutes.parcel(parcel.parcelId)}>Cancel</Link>
        </Button>
      </FormActions>
    </form>
  );
}
