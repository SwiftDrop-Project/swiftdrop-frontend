"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
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
import { FieldError, FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { webhooksApi } from "../api";
import { DEFAULT_EVENT_TYPES, WEBHOOK_EVENT_DESCRIPTION, WEBHOOK_EVENT_LABEL, WEBHOOK_EVENT_TYPES } from "../labels";
import { webhookSchema, type WebhookValues } from "../schemas";
import type { UpdateWebhookRequest, Webhook, WebhookWithSecret } from "../types";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";
const FIELDS = ["url", "eventTypes"] as const;

/**
 * Add a webhook (no `webhook`) or edit one. On create the parent shows the secret; on edit only the changed fields
 * are sent. Address checks the browser can't do (DNS, private networks) come back from the server under the field.
 */
export function WebhookFormDialog({
  open,
  onOpenChange,
  webhook,
  onCreated,
  onUpdated,
  onNotApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: Webhook;
  onCreated?: (created: WebhookWithSecret) => void;
  onUpdated?: (updated: Webhook) => void;
  /** The backend said the merchant isn't approved (403 MERCHANT_NOT_APPROVED). */
  onNotApproved?: () => void;
}) {
  const editing = webhook !== undefined;
  const [notice, setNotice] = React.useState<{ title: string; message: string } | null>(null);
  // Edit starts from the webhook's own events; Add starts with the common ones ticked (one webhook, several events).
  const defaults = React.useMemo<WebhookValues>(
    () => ({ url: webhook?.url ?? "", eventTypes: webhook ? webhook.eventTypes : [...DEFAULT_EVENT_TYPES] }),
    [webhook],
  );
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WebhookValues>({ resolver: zodResolver(webhookSchema), defaultValues: defaults });

  // Each time the dialog opens it starts from the webhook as it is now (or empty for "Add").
  React.useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  function handleOpenChange(next: boolean) {
    if (!next) setNotice(null);
    onOpenChange(next);
  }

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      if (editing) {
        const changes = changedFields(webhook, values);
        if (Object.keys(changes).length === 0) {
          handleOpenChange(false);
          return;
        }
        const updated = await webhooksApi.update(webhook.id, changes);
        handleOpenChange(false);
        onUpdated?.(updated);
      } else {
        const created = await webhooksApi.create({ url: values.url.trim(), eventTypes: values.eventTypes });
        handleOpenChange(false);
        onCreated?.(created);
      }
    } catch (error) {
      if (!isApiError(error)) {
        setNotice({ title: saveFailedTitle(editing), message: UNKNOWN_ERROR });
        return;
      }
      if (error.code === "MERCHANT_NOT_APPROVED") onNotApproved?.();
      const { handled, unmatched } = applyServerFieldErrors(error, setError, FIELDS);
      if (!handled || unmatched.length > 0) {
        setNotice({ title: saveFailedTitle(editing), message: unmatched[0] ?? error.message });
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit webhook" : "Add webhook"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes apply to new events. Deliveries already waiting keep the address they were made for."
              : "One webhook per server or system. Choose all the events it handles; your server tells them apart by type."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogBody>
            {notice ? (
              <InlineNotice tone="error" title={notice.title}>
                {notice.message}
              </InlineNotice>
            ) : null}

            <FormField
              id="webhook-url"
              label="Endpoint URL"
              helper="A public https:// address on your server. Requests time out after 10 seconds."
              error={errors.url?.message}
            >
              {(a11y) => (
                <Input
                  {...a11y}
                  {...register("url")}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="https://shop.example.com/webhooks"
                />
              )}
            </FormField>

            <Controller
              control={control}
              name="eventTypes"
              render={({ field }) => {
                const selected = new Set(field.value);
                const allSelected = selected.size === WEBHOOK_EVENT_TYPES.length;
                const describedBy = ["webhook-events-help", errors.eventTypes ? "webhook-events-error" : null]
                  .filter(Boolean)
                  .join(" ");
                const toggle = (type: (typeof WEBHOOK_EVENT_TYPES)[number], checked: boolean) => {
                  const next = new Set(selected);
                  if (checked) next.add(type);
                  else next.delete(type);
                  // keep the order of the event table
                  field.onChange(WEBHOOK_EVENT_TYPES.filter((item) => next.has(item)));
                };
                return (
                  <fieldset className="flex flex-col gap-3" aria-describedby={describedBy}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-4">
                        <legend className="text-label text-grey-900">Events</legend>
                        <div className="flex items-center gap-4">
                          {!allSelected ? (
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => field.onChange([...WEBHOOK_EVENT_TYPES])}
                            >
                              Select all
                            </Button>
                          ) : null}
                          {selected.size > 0 ? (
                            <Button type="button" variant="link" onClick={() => field.onChange([])}>
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <p id="webhook-events-help" className="text-body-sm text-grey-600">
                        {editing
                          ? "Add or remove events here instead of creating another webhook for the same address."
                          : "You can change these later. There's no need for a separate webhook per status."}
                      </p>
                    </div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {WEBHOOK_EVENT_TYPES.map((type) => {
                        const id = `webhook-event-${type}`;
                        return (
                          <li
                            key={type}
                            className="flex items-start gap-3 rounded-md border border-grey-200 p-3 has-data-[state=checked]:border-grey-400"
                          >
                            <Checkbox
                              id={id}
                              checked={selected.has(type)}
                              onCheckedChange={(checked) => toggle(type, checked === true)}
                              onBlur={field.onBlur}
                              className="mt-0.5"
                            />
                            <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
                              <span className="text-label text-grey-900">{WEBHOOK_EVENT_LABEL[type]}</span>
                              <span className="text-caption text-grey-600">{WEBHOOK_EVENT_DESCRIPTION[type]}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    {errors.eventTypes?.message ? (
                      <FieldError id="webhook-events-error">{errors.eventTypes.message}</FieldError>
                    ) : null}
                  </fieldset>
                );
              }}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Save changes" : "Add webhook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function saveFailedTitle(editing: boolean): string {
  return editing ? "We couldn't save the changes" : "We couldn't add the webhook";
}

/** Only what differs from the current webhook, so PATCH changes nothing else. */
function changedFields(webhook: Webhook, values: WebhookValues): UpdateWebhookRequest {
  const changes: UpdateWebhookRequest = {};
  const url = values.url.trim();
  if (url !== webhook.url) changes.url = url;
  const sameEvents =
    values.eventTypes.length === webhook.eventTypes.length &&
    values.eventTypes.every((type) => webhook.eventTypes.includes(type));
  if (!sameEvents) changes.eventTypes = values.eventTypes;
  return changes;
}
