"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatRs } from "@/lib/format";
import { ImagePicker } from "@/components/ui/image-picker";
import { FAILURE_REASON_OPTIONS, TASK_PROBLEM_OPTIONS } from "../lib/labels";
import {
  actionId,
  submitDelivered,
  type ActionFailure,
  type ParcelAction,
  type UploadedProof,
} from "../lib/parcel-actions";
import { prepareProofPhoto, ProofPhotoError } from "../lib/proof-photo";
import {
  confirmStepRequest,
  confirmStepSchema,
  deliveredRequest,
  deliveredSchema,
  failedRequest,
  failedSchema,
  NOTE_MAX_LENGTH,
  PROOF_MAX_BYTES,
  PROOF_MESSAGES,
  proofFileError,
  unableToCollectRequest,
  unableToCollectSchema,
  type ConfirmStepValues,
  type DeliveredValues,
  type FailedInput,
  type FailedValues,
  type UnableToCollectInput,
  type UnableToCollectValues,
} from "../schemas";
import type { CourierDelivery, CourierDeliveryDetail } from "../types";
import { ActionFormShell, GuardedDialog } from "./action-dialog";
import { HandoverForm } from "./handover-dialog";
import { useActionSubmit, type ActionFormProps } from "./use-action-submit";

export interface ParcelActionTarget {
  delivery: CourierDelivery;
  action: ParcelAction;
}

/**
 * The dialog for one action on one parcel (an action the API offers: one of its `nextStatuses`, or Unable to Collect).
 * It sends the action, then hands the result to the page:
 * - saved → onSaved(the parcel as the API returned it), and the dialog closes
 * - the parcel or its task changed, or the parcel is gone → onFailure, and the dialog closes
 * - field errors or a failed request → shown in the dialog, which stays open
 * While it is saving, it can't be closed and the button can't be pressed again; `onSavingChange` lets the page's
 * other buttons wait.
 */
export function ParcelActionDialog({
  target,
  districtName,
  onClose,
  onSavingChange,
  onSaved,
  onFailure,
}: {
  /** null: closed. */
  target: ParcelActionTarget | null;
  districtName: (code: string) => string;
  onClose: () => void;
  onSavingChange?: (saving: boolean) => void;
  onSaved: (delivery: CourierDeliveryDetail, message: string) => void;
  onFailure: (failure: Extract<ActionFailure, { kind: "reload" | "gone" }>) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const reportSaving = React.useCallback(
    (value: boolean) => {
      setSaving(value);
      onSavingChange?.(value);
    },
    [onSavingChange],
  );

  return (
    <GuardedDialog
      open={target !== null}
      saving={saving}
      onClose={onClose}
      // A key per parcel, task and action, so every opening starts with an empty form.
      contentKey={
        target ? `${target.delivery.parcelId}:${target.delivery.task.assignmentId}:${actionId(target.action)}` : "closed"
      }
    >
      {target ? (
        <ActionForm
          delivery={target.delivery}
          action={target.action}
          districtName={districtName}
          onSavingChange={reportSaving}
          onClose={onClose}
          onSaved={onSaved}
          onFailure={onFailure}
        />
      ) : null}
    </GuardedDialog>
  );
}

function ActionForm(props: ActionFormProps) {
  switch (props.action.kind) {
    case "confirm":
      return <ConfirmForm {...props} />;
    case "handover":
      return <HandoverForm {...props} />;
    case "delivered":
      return <DeliveredForm {...props} />;
    case "failed":
      return <FailedForm {...props} />;
    case "unable":
      return <UnableToCollectForm {...props} />;
  }
}

function NoteField({
  id,
  required,
  error,
  example,
  registration,
}: {
  id: string;
  required?: boolean;
  error?: string;
  example: string;
  registration: React.ComponentProps<"textarea">;
}) {
  return (
    <FormField
      id={id}
      label="Note"
      labelHint={required ? undefined : "(optional)"}
      helper={
        required
          ? `Required for Other. Up to ${NOTE_MAX_LENGTH} characters.`
          : `Up to ${NOTE_MAX_LENGTH} characters, e.g. "${example}".`
      }
      error={error}
    >
      {(a11y) => <Textarea {...a11y} {...registration} rows={3} />}
    </FormField>
  );
}

/** PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY: confirm, with an optional note. */
function ConfirmForm(props: ActionFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmStepValues>({ resolver: zodResolver(confirmStepSchema), defaultValues: { note: "" } });
  const { text, notice, sendStatus } = useActionSubmit(props, setError, ["note"]);
  const status = props.action.kind === "confirm" ? props.action.status : "PICKED_UP";

  return (
    <ActionFormShell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      onSubmit={handleSubmit((values) => sendStatus(confirmStepRequest(status, confirmStepSchema.parse(values))))}
      onCancel={props.onClose}
    >
      <NoteField
        id="action-note"
        error={errors.note?.message}
        example={status === "PICKED_UP" ? "Collected from the front desk" : "Two boxes"}
        registration={register("note")}
      />
    </ActionFormShell>
  );
}

/**
 * DELIVERED with proof of delivery: who received it, and a photo of the delivery slip they signed (both required),
 * plus a reminder of the cash to collect. Confirming uploads the photo first and then marks the parcel DELIVERED with
 * it; if the upload fails nothing is delivered, and if the second step fails the uploaded photo is reused on retry
 * (unless it was changed or refused).
 */
function DeliveredForm(props: ActionFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<DeliveredValues>({
    resolver: zodResolver(deliveredSchema),
    mode: "onChange",
    defaultValues: { recipientName: "", note: "" },
  });
  const { text, notice, sendWith } = useActionSubmit(props, setError, ["recipientName", "note"]);
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<string | null>(null);
  const uploaded = React.useRef<UploadedProof | null>(null);
  const cash = props.delivery.codAmount;
  const photoReady = photo !== null && proofFileError(photo) === null;

  function choose(file: File | null) {
    setPhoto(file);
    // A new photo is checked at once; removing it clears the message until the courier confirms.
    setPhotoError(file ? proofFileError(file) : null);
  }

  // Runs only on submit (it reads the `uploaded` ref): handleSubmit wraps it in the event handler below.
  const confirm = (values: DeliveredValues) => {
    const problem = proofFileError(photo);
    if (problem || !photo) {
      setPhotoError(problem ?? PROOF_MESSAGES.required);
      return;
    }
    const parsed = deliveredSchema.parse(values);
    setProgress(
      uploaded.current?.file === photo
        ? "Confirming the delivery…"
        : "Uploading the photo, then confirming the delivery…",
    );
    return sendWith(
      async () => {
        let prepared;
        try {
          prepared = await prepareProofPhoto(photo);
        } catch (error) {
          const message = error instanceof ProofPhotoError ? error.message : PROOF_MESSAGES.unreadable;
          return { ok: false, failure: { kind: "fields", message, fieldErrors: { file: message } } } as const;
        }
        const result = await submitDelivered(
          props.delivery.parcelId,
          { original: photo, prepared: prepared.blob, fileName: prepared.fileName },
          (proofPhotoId) => deliveredRequest(parsed, proofPhotoId),
          uploaded.current,
        );
        if (!result.ok) uploaded.current = result.uploaded;
        return result;
      },
      // Photo problems (the upload's "file", or a refused "proofPhotoId") go under the photo, not in a notice.
      ({ file, proofPhotoId, ...rest }) => {
        const message = file ?? proofPhotoId;
        if (message) setPhotoError(message);
        return rest;
      },
    );
  };

  return (
    <ActionFormShell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      submitDisabled={!isValid || !photoReady}
      onSubmit={(event) => void handleSubmit(confirm)(event)}
      onCancel={props.onClose}
    >
      {cash !== null ? (
        <InlineNotice title={`Collect ${formatRs(cash)} in cash`}>
          Take the cash before you hand the parcel over.
        </InlineNotice>
      ) : null}
      <FormField id="action-recipient" label="Received by" error={errors.recipientName?.message}>
        {(a11y) => <Input {...a11y} {...register("recipientName")} autoComplete="off" />}
      </FormField>
      <ImagePicker
        id="action-proof"
        label="Photo of the signed delivery slip"
        helper={`Required. JPEG, PNG or WebP, up to ${PROOF_MAX_BYTES / (1024 * 1024)} MB. Make sure the signature can be read.`}
        file={photo}
        onChange={choose}
        error={photoError ?? undefined}
        disabled={isSubmitting}
      />
      {isSubmitting && progress ? (
        <p className="text-body-sm text-grey-600" aria-live="polite">
          {progress}
        </p>
      ) : null}
      <NoteField
        id="action-note"
        error={errors.note?.message}
        example="Left with the security guard"
        registration={register("note")}
      />
    </ActionFormShell>
  );
}

/** FAILED: why the delivery failed, and a note for Other. The parcel must then be returned to the branch. */
function FailedForm(props: ActionFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FailedInput, unknown, FailedValues>({
    resolver: zodResolver(failedSchema),
    defaultValues: { failureReason: "", note: "" },
  });
  const { text, notice, sendStatus } = useActionSubmit(props, setError, ["failureReason", "note"]);
  const noteRequired = useWatch({ control, name: "failureReason" }) === "OTHER";

  return (
    <ActionFormShell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      onSubmit={handleSubmit((values) => sendStatus(failedRequest(values)))}
      onCancel={props.onClose}
    >
      <FormField id="action-failure-reason" label="Reason" error={errors.failureReason?.message}>
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
      <NoteField
        id="action-note"
        required={noteRequired}
        error={errors.note?.message}
        example="No answer, called twice"
        registration={register("note")}
      />
    </ActionFormShell>
  );
}

/**
 * "Unable to Collect", the one form for pickups and deliveries: why the courier couldn't take the parcel, and a note
 * for Other. The backend records NOT_COLLECTED (pickup) or NOT_LOADED (delivery) from the task.
 */
function UnableToCollectForm(props: ActionFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UnableToCollectInput, unknown, UnableToCollectValues>({
    resolver: zodResolver(unableToCollectSchema),
    defaultValues: { problem: "", note: "" },
  });
  const { text, notice, sendUnableToCollect } = useActionSubmit(props, setError, ["problem", "note"]);
  const noteRequired = useWatch({ control, name: "problem" }) === "OTHER";

  return (
    <ActionFormShell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      onSubmit={handleSubmit((values) => sendUnableToCollect(unableToCollectRequest(values)))}
      onCancel={props.onClose}
    >
      <FormField id="action-problem" label="Reason" error={errors.problem?.message}>
        {(a11y) => (
          <Select {...a11y} {...register("problem")}>
            <option value="" disabled>
              Select a reason
            </option>
            {TASK_PROBLEM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <NoteField
        id="action-note"
        required={noteRequired}
        error={errors.note?.message}
        example="Shop closed until 2 pm"
        registration={register("note")}
      />
    </ActionFormShell>
  );
}
