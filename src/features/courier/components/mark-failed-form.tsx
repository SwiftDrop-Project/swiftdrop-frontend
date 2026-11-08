"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormActions, FormSection } from "@/components/layout/form-page";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { formatTrackingNumber } from "@/lib/format";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { courierApi } from "../api";
import { useStatusSubmitError } from "../hooks/use-status-submit-error";
import { courierRoutes, FAILURE_REASON_OPTIONS, STEP_ACTION_LABEL } from "../lib/labels";
import {
  markFailedSchema,
  NOTE_MAX_LENGTH,
  optionalNote,
  type MarkFailedInput,
  type MarkFailedValues,
} from "../schemas";
import type { CourierDeliveryDetail } from "../types";
import { StatusFormPage } from "./status-form-page";

/** /courier/deliveries/[parcelId]/failed: why the delivery failed, then FAILED. */
export function MarkFailedForm({ parcelId }: { parcelId: string }) {
  return (
    <StatusFormPage parcelId={parcelId} target="FAILED" title={STEP_ACTION_LABEL.FAILED}>
      {(parcel) => <FailedForm parcel={parcel} />}
    </StatusFormPage>
  );
}

function FailedForm({ parcel }: { parcel: CourierDeliveryDetail }) {
  const router = useRouter();
  const { notice, setNotice, handleError } = useStatusSubmitError(parcel.parcelId);
  // Stays true after a successful save so the button keeps spinning until the page changes.
  const [leaving, setLeaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MarkFailedInput, unknown, MarkFailedValues>({
    resolver: zodResolver(markFailedSchema),
    defaultValues: { failureReason: "", note: "" },
  });

  const noteRequired = useWatch({ control, name: "failureReason" }) === "OTHER";

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      await courierApi.changeStatus(parcel.parcelId, {
        status: "FAILED",
        failureReason: values.failureReason,
        note: optionalNote(values.note),
      });
      setLeaving(true);
      toast({ tone: "success", title: `${formatTrackingNumber(parcel.trackingNumber)} marked as failed` });
      router.replace(courierRoutes.today);
    } catch (error) {
      handleError(error, (apiError) => applyServerFieldErrors(apiError, setError, ["failureReason", "note"]));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-12">
      {notice ? (
        <InlineNotice tone={notice.tone} title={notice.title}>
          {notice.body}
        </InlineNotice>
      ) : null}

      <FormSection title="What went wrong" description="Pick the reason closest to what happened.">
        <FormField id="failureReason" label="Reason" error={errors.failureReason?.message}>
          {(a11y) => (
            <Select {...a11y} {...register("failureReason")}>
              <option value="" disabled>
                Select a reason
              </option>
              {FAILURE_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="note"
          label="Note"
          labelHint={noteRequired ? undefined : "(optional)"}
          helper={
            noteRequired
              ? `Required for Other. Up to ${NOTE_MAX_LENGTH} characters.`
              : `Up to ${NOTE_MAX_LENGTH} characters, e.g. "Gate locked, no answer on the phone".`
          }
          error={errors.note?.message}
        >
          {(a11y) => <Textarea {...a11y} {...register("note")} rows={3} />}
        </FormField>
      </FormSection>

      <FormActions>
        <Button type="submit" loading={isSubmitting || leaving}>
          {STEP_ACTION_LABEL.FAILED}
        </Button>
        <Button asChild variant="secondary">
          <Link href={courierRoutes.parcel(parcel.parcelId)}>Cancel</Link>
        </Button>
      </FormActions>
    </form>
  );
}
