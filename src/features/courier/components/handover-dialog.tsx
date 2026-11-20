"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useController, useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatTrackingNumber } from "@/lib/format";
import { courierParcelStatus } from "../lib/parcel-status";
import type { OutcomeFailure } from "../lib/outcome-flow";
import { handoverCandidates, handoverText, submitHandover } from "../lib/task-actions";
import { handoverRequest, handoverSchema, NOTE_MAX_LENGTH, type HandoverValues } from "../schemas";
import type { CourierTaskDetail } from "../types";
import { ActionFormShell, applyFieldErrors, GuardedDialog, useSingleFlight, type ActionNotice } from "./action-dialog";

/**
 * Hand over at the branch (PICKUP, TRANSFER) or return failed deliveries to the branch (DELIVERY). Lists the parcels
 * the API marked readyForHandover, all selected; the courier may leave some out. All or nothing: if the API refuses
 * one parcel, nothing is handed over and the task is reloaded.
 */
export function HandoverDialog({
  task,
  open,
  districtName,
  onClose,
  onSavingChange,
  onSaved,
  onFailure,
}: {
  task: CourierTaskDetail;
  open: boolean;
  districtName: (code: string) => string;
  onClose: () => void;
  onSavingChange: (saving: boolean) => void;
  onSaved: (task: CourierTaskDetail, message: string) => void;
  onFailure: (failure: Extract<OutcomeFailure, { kind: "reload" | "gone" }>) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const reportSaving = React.useCallback(
    (value: boolean) => {
      setSaving(value);
      onSavingChange(value);
    },
    [onSavingChange],
  );

  return (
    <GuardedDialog open={open} saving={saving} onClose={onClose} contentKey={`handover:${task.assignmentId}`}>
      <HandoverForm
        task={task}
        districtName={districtName}
        onClose={onClose}
        onSavingChange={reportSaving}
        onSaved={onSaved}
        onFailure={onFailure}
      />
    </GuardedDialog>
  );
}

function HandoverForm({
  task,
  districtName,
  onClose,
  onSavingChange,
  onSaved,
  onFailure,
}: {
  task: CourierTaskDetail;
  districtName: (code: string) => string;
  onClose: () => void;
  onSavingChange: (saving: boolean) => void;
  onSaved: (task: CourierTaskDetail, message: string) => void;
  onFailure: (failure: Extract<OutcomeFailure, { kind: "reload" | "gone" }>) => void;
}) {
  const candidates = handoverCandidates(task);
  const text = handoverText(task, districtName);
  const [notice, setNotice] = React.useState<ActionNotice | null>(null);
  const singleFlight = useSingleFlight(onSavingChange);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<HandoverValues>({
    resolver: zodResolver(handoverSchema),
    defaultValues: { parcelIds: candidates.map((item) => item.parcelId), receivedBy: "", note: "" },
  });
  const { field: parcelIdsField } = useController({ control, name: "parcelIds" });
  const selected = new Set(parcelIdsField.value);

  function toggle(parcelId: string, checked: boolean) {
    // Keep the task's order, whatever order the boxes are ticked in.
    const next = candidates
      .map((item) => item.parcelId)
      .filter((id) => (id === parcelId ? checked : selected.has(id)));
    parcelIdsField.onChange(next);
  }

  const onSubmit = handleSubmit((values) =>
    singleFlight(async () => {
      setNotice(null);
      const body = handoverRequest(handoverSchema.parse(values));
      const result = await submitHandover(task.assignmentId, body);
      if (result.ok) {
        onSaved(result.task, text.success(body.parcelIds.length));
        onClose();
        return;
      }
      const failure = result.failure;
      if (failure.kind === "reload" || failure.kind === "gone") {
        onFailure(failure);
        onClose();
        return;
      }
      if (failure.kind === "fields") {
        setNotice(applyFieldErrors(failure, setError, ["parcelIds", "receivedBy", "note"]));
        return;
      }
      setNotice({ title: failure.title, message: failure.message });
    }),
  );

  return (
    <ActionFormShell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={selected.size > 0 ? `${text.submit} (${selected.size})` : text.submit}
      saving={isSubmitting}
      onSubmit={onSubmit}
      onCancel={onClose}
    >
      <fieldset className="flex flex-col gap-2" aria-describedby={errors.parcelIds ? "handover-parcels-error" : undefined}>
        <legend className="mb-2 text-label text-grey-900">
          {text.returning ? "Parcels to return" : "Parcels to hand over"}
        </legend>
        <ul className="flex flex-col divide-y divide-grey-100 rounded-md border border-grey-200">
          {candidates.map((item) => {
            const id = `handover-${item.parcelId}`;
            return (
              <li key={item.parcelId} className="flex items-start gap-3 p-3">
                <Checkbox
                  id={id}
                  className="mt-0.5"
                  checked={selected.has(item.parcelId)}
                  onCheckedChange={(checked) => toggle(item.parcelId, checked === true)}
                  disabled={isSubmitting}
                />
                <label htmlFor={id} className="flex min-w-0 flex-col gap-0.5 text-body-sm">
                  <span className="text-label font-semibold text-grey-900 tabular-nums">
                    {item.sequence}. {formatTrackingNumber(item.trackingNumber)}
                  </span>
                  <span className="break-words text-grey-600">
                    {courierParcelStatus(task.type, item.outcome).label} · {item.from.city} → {item.to.city}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {errors.parcelIds?.message ? (
          <FieldError id="handover-parcels-error">{errors.parcelIds.message}</FieldError>
        ) : null}
      </fieldset>

      <FormField
        id="handover-received-by"
        label="Received by"
        helper={`The name of the person at ${text.branch} who takes the parcels.`}
        error={errors.receivedBy?.message}
      >
        {(a11y) => <Input {...a11y} {...register("receivedBy")} autoComplete="off" />}
      </FormField>

      <FormField
        id="handover-note"
        label="Note"
        labelHint="(optional)"
        helper={`Up to ${NOTE_MAX_LENGTH} characters, e.g. "Counter 2".`}
        error={errors.note?.message}
      >
        {(a11y) => <Textarea {...a11y} {...register("note")} rows={2} />}
      </FormField>
    </ActionFormShell>
  );
}
