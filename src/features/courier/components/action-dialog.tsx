"use client";

import * as React from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
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
import { InlineNotice } from "@/components/ui/inline-notice";

/*
 * The dialogs for the courier's parcel actions (status steps, handover or return, Unable to Collect) share these: a
 * dialog that can't be closed while it is saving, and a form layout with a title, an error notice, the fields and
 * Cancel / submit.
 */

/** A dialog that stays open while `saving` (Cancel, Escape, a click outside and the X are ignored). */
export function GuardedDialog({
  open,
  saving,
  onClose,
  contentKey,
  children,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  /** Changes for every new opening, so the form inside starts empty. */
  contentKey: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      {open ? (
        <DialogContent
          key={contentKey}
          onEscapeKeyDown={(event) => saving && event.preventDefault()}
          onInteractOutside={(event) => saving && event.preventDefault()}
        >
          {children}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

export interface ActionNotice {
  title: string;
  message: string;
}

/** Title, description, an error notice, the fields, and Cancel / submit (submit spins while saving). */
export function ActionFormShell({
  title,
  description,
  notice,
  submitLabel,
  saving,
  submitDisabled = false,
  onSubmit,
  onCancel,
  children,
}: {
  title: string;
  description: React.ReactNode;
  notice: ActionNotice | null;
  submitLabel: string;
  saving: boolean;
  submitDisabled?: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6" aria-busy={saving}>
      <DialogHeader>
        <DialogTitle className="tabular-nums">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogBody>
        {notice ? (
          <InlineNotice tone="error" title={notice.title}>
            {notice.message}
          </InlineNotice>
        ) : null}
        {children}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={submitDisabled}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Puts the API's field errors under the form's fields (focusing the first). Returns a notice for messages about
 * fields the form doesn't have, or when no field matched; null when every message found its field.
 */
export function applyFieldErrors<T extends FieldValues>(
  failure: { message: string; fieldErrors: Record<string, string> },
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): ActionNotice | null {
  const known = new Set<string>(fields);
  const unmatched: string[] = [];
  let focused = false;
  for (const [field, message] of Object.entries(failure.fieldErrors)) {
    if (known.has(field)) {
      setError(field as Path<T>, { type: "server", message }, { shouldFocus: !focused });
      focused = true;
    } else {
      unmatched.push(message);
    }
  }
  return focused && unmatched.length === 0
    ? null
    : { title: "Check the details", message: unmatched.join(" ") || failure.message };
}

/**
 * Runs one request at a time: a second call while one is running is ignored, and `onSavingChange` reports it, so the
 * dialog can't be closed and the page's other actions wait.
 */
export function useSingleFlight(onSavingChange: (saving: boolean) => void) {
  const inFlight = React.useRef(false);
  return React.useCallback(
    async (work: () => Promise<void>) => {
      if (inFlight.current) return;
      inFlight.current = true;
      onSavingChange(true);
      try {
        await work();
      } finally {
        inFlight.current = false;
        onSavingChange(false);
      }
    },
    [onSavingChange],
  );
}
