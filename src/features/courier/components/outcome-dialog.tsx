"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm, useWatch, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatRs } from "@/lib/format";
import { FAILURE_REASON_OPTIONS, TASK_PROBLEM_OPTIONS } from "../lib/labels";
import {
  OUTCOME_FORM_KIND,
  outcomeDialogText,
  submitOutcome,
  type OutcomeFailure,
} from "../lib/outcome-flow";
import {
  deliveredRequest,
  deliveredSchema,
  failedRequest,
  failedSchema,
  NOTE_MAX_LENGTH,
  notTakenRequest,
  notTakenSchema,
  outcomeStepRequest,
  outcomeStepSchema,
  type DeliveredValues,
  type FailedInput,
  type FailedValues,
  type NotTakenInput,
  type NotTakenValues,
  type OutcomeStepValues,
} from "../schemas";
import type { AssignmentType, CourierTaskDetail, CourierTaskItem, ItemOutcomeRequest, RecordableOutcome } from "../types";
import { ActionFormShell, applyFieldErrors, GuardedDialog, useSingleFlight, type ActionNotice } from "./action-dialog";

export interface OutcomeTarget {
  item: CourierTaskItem;
  outcome: RecordableOutcome;
}

/**
 * The dialog for one outcome on one parcel (an outcome the API listed in item.allowedOutcomes). It sends the outcome,
 * then hands the result to the task page:
 * - saved → onSaved(the task as the API returned it), and the dialog closes
 * - the task changed (stale) or the task is gone → onFailure, and the dialog closes
 * - field errors or a failed request → shown in the dialog, which stays open
 * While it is saving, it can't be closed and the button can't be pressed again.
 */
export function OutcomeDialog({
  assignmentId,
  taskType,
  target,
  onClose,
  onSaved,
  onFailure,
}: {
  assignmentId: string;
  taskType: AssignmentType;
  /** null: closed. */
  target: OutcomeTarget | null;
  onClose: () => void;
  onSaved: (task: CourierTaskDetail, message: string) => void;
  onFailure: (failure: Extract<OutcomeFailure, { kind: "reload" | "gone" }>) => void;
}) {
  const [saving, setSaving] = React.useState(false);

  return (
    <GuardedDialog
      open={target !== null}
      saving={saving}
      onClose={onClose}
      // A key per parcel and outcome, so every opening starts with an empty form.
      contentKey={target ? `${target.item.parcelId}:${target.outcome}` : "closed"}
    >
      {target ? (
        <OutcomeForm
          assignmentId={assignmentId}
          taskType={taskType}
          target={target}
          onSavingChange={setSaving}
          onClose={onClose}
          onSaved={onSaved}
          onFailure={onFailure}
        />
      ) : null}
    </GuardedDialog>
  );
}

interface FormProps {
  assignmentId: string;
  taskType: AssignmentType;
  target: OutcomeTarget;
  onSavingChange: (saving: boolean) => void;
  onClose: () => void;
  onSaved: (task: CourierTaskDetail, message: string) => void;
  onFailure: (failure: Extract<OutcomeFailure, { kind: "reload" | "gone" }>) => void;
}

function OutcomeForm(props: FormProps) {
  switch (OUTCOME_FORM_KIND[props.target.outcome]) {
    case "confirm":
      return <ConfirmForm {...props} />;
    case "not-taken":
      return <NotTakenForm {...props} />;
    case "delivered":
      return <DeliveredForm {...props} />;
    case "failed":
      return <FailedForm {...props} />;
  }
}

/**
 * The one way an outcome is sent: guards against a second press, reports saving to the dialog, and sorts the answer.
 * Returns a submit function for react-hook-form's handleSubmit and the notice to show inside the dialog.
 */
function useOutcomeSubmit<T extends FieldValues>(
  { assignmentId, taskType, target, onSavingChange, onClose, onSaved, onFailure }: FormProps,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  const [notice, setNotice] = React.useState<ActionNotice | null>(null);
  const singleFlight = useSingleFlight(onSavingChange);
  const text = outcomeDialogText(target.outcome, target.item, taskType);

  const send = (body: ItemOutcomeRequest) =>
    singleFlight(async () => {
      setNotice(null);
      const result = await submitOutcome(assignmentId, target.item.parcelId, body);
      if (result.ok) {
        onSaved(result.task, text.success);
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
        setNotice(applyFieldErrors(failure, setError, fields));
        return;
      }
      setNotice({ title: failure.title, message: failure.message });
    });

  return { text, notice, send };
}

const Shell = ActionFormShell;

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

/** COLLECTED / LOADED: confirm, with an optional note. */
function ConfirmForm(props: FormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OutcomeStepValues>({ resolver: zodResolver(outcomeStepSchema), defaultValues: { note: "" } });
  const { text, notice, send } = useOutcomeSubmit(props, setError, ["note"]);
  const outcome = props.target.outcome as "COLLECTED" | "LOADED";

  return (
    <Shell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      onSubmit={handleSubmit((values) => send(outcomeStepRequest(outcome, outcomeStepSchema.parse(values))))}
      onCancel={props.onClose}
    >
      <NoteField
        id="outcome-note"
        error={errors.note?.message}
        example={outcome === "COLLECTED" ? "Collected from the front desk" : "Two boxes"}
        registration={register("note")}
      />
    </Shell>
  );
}

/** NOT_COLLECTED / NOT_LOADED: why, and a note for Other. */
function NotTakenForm(props: FormProps) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NotTakenInput, unknown, NotTakenValues>({
    resolver: zodResolver(notTakenSchema),
    defaultValues: { problem: "", note: "" },
  });
  const { text, notice, send } = useOutcomeSubmit(props, setError, ["problem", "note"]);
  const outcome = props.target.outcome as "NOT_COLLECTED" | "NOT_LOADED";
  const noteRequired = useWatch({ control, name: "problem" }) === "OTHER";

  return (
    <Shell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      onSubmit={handleSubmit((values) => send(notTakenRequest(outcome, values)))}
      onCancel={props.onClose}
    >
      <FormField id="outcome-problem" label="Reason" error={errors.problem?.message}>
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
        id="outcome-note"
        required={noteRequired}
        error={errors.note?.message}
        example="Shop closed until 2 pm"
        registration={register("note")}
      />
    </Shell>
  );
}

/** DELIVERED: who received it (and a reminder of the cash to collect). */
function DeliveredForm(props: FormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeliveredValues>({
    resolver: zodResolver(deliveredSchema),
    defaultValues: { recipientName: "", note: "" },
  });
  const { text, notice, send } = useOutcomeSubmit(props, setError, ["recipientName", "note"]);
  const cash = props.target.item.codAmount;

  return (
    <Shell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      onSubmit={handleSubmit((values) => send(deliveredRequest(deliveredSchema.parse(values))))}
      onCancel={props.onClose}
    >
      {cash !== null ? (
        <InlineNotice title={`Collect ${formatRs(cash)} in cash`}>
          Take the cash before you hand the parcel over.
        </InlineNotice>
      ) : null}
      <FormField id="outcome-recipient" label="Received by" error={errors.recipientName?.message}>
        {(a11y) => <Input {...a11y} {...register("recipientName")} autoComplete="off" />}
      </FormField>
      <NoteField
        id="outcome-note"
        error={errors.note?.message}
        example="Left with the security guard"
        registration={register("note")}
      />
    </Shell>
  );
}

/** FAILED: why the delivery failed, and a note for Other. */
function FailedForm(props: FormProps) {
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
  const { text, notice, send } = useOutcomeSubmit(props, setError, ["failureReason", "note"]);
  const noteRequired = useWatch({ control, name: "failureReason" }) === "OTHER";

  return (
    <Shell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      onSubmit={handleSubmit((values) => send(failedRequest(values)))}
      onCancel={props.onClose}
    >
      <FormField id="outcome-failure-reason" label="Reason" error={errors.failureReason?.message}>
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
        id="outcome-note"
        required={noteRequired}
        error={errors.note?.message}
        example="No answer, called twice"
        registration={register("note")}
      />
    </Shell>
  );
}
