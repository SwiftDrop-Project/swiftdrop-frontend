"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { branchText } from "../lib/parcel-view";
import { handoverRequest, handoverSchema, NOTE_MAX_LENGTH, type HandoverValues } from "../schemas";
import { ActionFormShell } from "./action-dialog";
import { useActionSubmit, type ActionFormProps } from "./use-action-submit";

/**
 * AT_BRANCH for one parcel: the handover at the branch (pickup, transfer) or the return of a failed delivery to the
 * branch. Both need the name of the person at the branch who took the parcel (2-100 characters, trimmed, same rule
 * as the backend). The branch is the task's (`task.branch`); the request has no branch field. A successful handover
 * or return completes the parcel for the courier.
 */
export function HandoverForm(props: ActionFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<HandoverValues>({ resolver: zodResolver(handoverSchema), defaultValues: { receivedBy: "", note: "" } });
  const { text, notice, sendStatus } = useActionSubmit(props, setError, ["receivedBy", "note"]);
  const branch = branchText(props.delivery.task.branch, props.districtName);

  return (
    <ActionFormShell
      title={text.title}
      description={text.description}
      notice={notice}
      submitLabel={text.submit}
      saving={isSubmitting}
      onSubmit={handleSubmit((values) => sendStatus(handoverRequest(handoverSchema.parse(values))))}
      onCancel={props.onClose}
    >
      <FormField
        id="handover-received-by"
        label="Received by"
        helper={`The name of the person at ${branch} who takes the parcel.`}
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
