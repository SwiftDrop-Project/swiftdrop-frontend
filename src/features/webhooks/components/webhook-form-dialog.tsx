"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import type { UpdateWebhookRequest, Webhook, WebhookEventType, WebhookWithSecret } from "../types";
import { findSameDestination, sameDestination, shortAddress } from "../url";

const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";
const FIELDS = ["url", "eventTypes"] as const;

/**
 * Add a webhook (no `webhook`) or edit one. On create the parent shows the secret; on edit only the changed fields
 * are sent. Address checks the browser can't do (DNS, private networks) come back from the server under the field.
 *
 * With `existing` (the merchant's webhooks) it warns while typing when the address is already used by another
 * webhook, and offers to add the chosen events to that one instead (`onUseExisting`). The backend's
 * 409 WEBHOOK_URL_IN_USE is still the real rule; it appears under the address field.
 */
export function WebhookFormDialog({
  open,
  onOpenChange,
  webhook,
  existing,
  initialEventTypes,
  onCreated,
  onUpdated,
  onNotApproved,
  onStale,
  onUseExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: Webhook;
  /** The merchant's webhooks, to spot an address that's already in use. */
  existing?: readonly Webhook[];
  /** Events to start with instead of the webhook's own (e.g. merged in from the Add dialog). */
  initialEventTypes?: readonly WebhookEventType[];
  onCreated?: (created: WebhookWithSecret) => void;
  onUpdated?: (updated: Webhook) => void;
  /** The backend said the merchant isn't approved (403 MERCHANT_NOT_APPROVED). */
  onNotApproved?: () => void;
  /** Edit: someone changed this webhook at the same moment (409 WEBHOOK_CHANGED); the caller loads the latest. */
  onStale?: () => void;
  /**
   * Add only: "use that webhook instead". Gets the matching webhook and the events chosen here merged with its own;
   * resolves to false when it couldn't continue (e.g. turning it on was refused), so this dialog stays open.
   */
  onUseExisting?: (match: Webhook, eventTypes: WebhookEventType[]) => Promise<boolean>;
}) {
  const editing = webhook !== undefined;
  const [notice, setNotice] = React.useState<{ title: string; message: string } | null>(null);
  const [switching, setSwitching] = React.useState(false);
  // Add starts with the common events ticked (one webhook, several events); Edit with the webhook's own events,
  // unless the caller passes events to start with.
  const defaults = React.useMemo<WebhookValues>(
    () => ({
      url: webhook?.url ?? "",
      eventTypes: [...(initialEventTypes ?? (webhook ? webhook.eventTypes : DEFAULT_EVENT_TYPES))],
    }),
    [webhook, initialEventTypes],
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

  const urlValue = useWatch({ control, name: "url" }) ?? "";
  const eventTypesValue = useWatch({ control, name: "eventTypes" }) ?? [];
  // Another webhook with the same destination. In Edit, only when the address was changed.
  const match = React.useMemo(() => {
    if (!existing) return undefined;
    if (webhook && sameDestination(urlValue, webhook.url)) return undefined;
    return findSameDestination(urlValue, existing, webhook?.id);
  }, [existing, webhook, urlValue]);

  async function switchToExisting(target: Webhook) {
    if (!onUseExisting) return;
    setSwitching(true);
    try {
      const merged = WEBHOOK_EVENT_TYPES.filter(
        (type) => target.eventTypes.includes(type) || eventTypesValue.includes(type),
      );
      await onUseExisting(target, merged);
    } finally {
      setSwitching(false);
    }
  }

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
      if (error.code === "WEBHOOK_CHANGED") {
        // nothing was saved: show the message and load the webhook as it is now (the form then shows it)
        setNotice({ title: saveFailedTitle(editing), message: error.message });
        onStale?.();
        return;
      }
      if (error.code === "WEBHOOK_URL_IN_USE") {
        // the address is the problem, so the message goes under the address field
        setError("url", { type: "server", message: error.message }, { shouldFocus: true });
        return;
      }
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
              helper="A public https:// address on your server. Your server must reply within 10 seconds."
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

            {match ? (
              <SameAddressNotice
                match={match}
                editing={editing}
                thisActive={webhook?.active ?? true}
                busy={switching}
                onUse={onUseExisting ? () => switchToExisting(match) : undefined}
              />
            ) : null}

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

/**
 * "This address is already used by another of your webhooks", worded for the case:
 * - Add, the other one is active: use it instead (adds the chosen events to it).
 * - Add, the other one is off: turn it on and use it instead.
 * - Edit: only a problem when both would be active (the backend refuses that); there's nothing to switch to here.
 */
function SameAddressNotice({
  match,
  editing,
  thisActive,
  busy,
  onUse,
}: {
  match: Webhook;
  editing: boolean;
  thisActive: boolean;
  busy: boolean;
  onUse?: () => void;
}) {
  const address = shortAddress(match.url);

  if (editing) {
    if (!thisActive || !match.active) return null;
    return (
      <InlineNotice title="Another of your webhooks already uses this address">
        Only one active webhook can use {address}. Choose another address, or add these events to that webhook
        instead.
      </InlineNotice>
    );
  }

  return (
    <InlineNotice
      title={
        match.active
          ? `You already have a webhook for ${address}`
          : `You have a turned-off webhook for ${address}`
      }
    >
      <p>
        {match.active
          ? "Add these events to it instead of creating a second webhook for the same address."
          : "Turn it on and choose its events instead of creating a second webhook for the same address."}
      </p>
      {onUse ? (
        <Button type="button" variant="secondary" className="mt-3" onClick={onUse} loading={busy}>
          {match.active ? "Edit that webhook" : "Turn it on and edit"}
        </Button>
      ) : null}
    </InlineNotice>
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
