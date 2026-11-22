"use client";

import * as React from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import {
  actionDialogText,
  submitStatus,
  submitUnableToCollect,
  type ActionFailure,
  type ParcelAction,
} from "../lib/parcel-actions";
import type { CourierDelivery, CourierDeliveryDetail, StatusChangeRequest, UnableToCollectRequest } from "../types";
import { applyFieldErrors, useSingleFlight, type ActionNotice } from "./action-dialog";

/** What every parcel action form gets from the dialog. */
export interface ActionFormProps {
  delivery: CourierDelivery;
  action: ParcelAction;
  districtName: (code: string) => string;
  onSavingChange: (saving: boolean) => void;
  onClose: () => void;
  /** Saved: the parcel as the API answered (with `completed` and `task.status` after the step). */
  onSaved: (delivery: CourierDeliveryDetail, message: string) => void;
  /** The parcel or its task changed, or the parcel is gone: the page reloads or leaves. */
  onFailure: (failure: Extract<ActionFailure, { kind: "reload" | "gone" }>) => void;
}

/**
 * The one way a parcel action is sent: guards against a second press, reports saving to the dialog, and sorts the
 * answer. Field errors and failed requests stay in the dialog; a changed or missing parcel closes it.
 */
export function useActionSubmit<T extends FieldValues>(
  { delivery, action, districtName, onSavingChange, onClose, onSaved, onFailure }: ActionFormProps,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  const [notice, setNotice] = React.useState<ActionNotice | null>(null);
  const singleFlight = useSingleFlight(onSavingChange);
  const text = actionDialogText(action, delivery, districtName);

  /**
   * `takeFieldErrors` lets a form handle some field errors itself (e.g. the photo, which isn't a react-hook-form
   * field): it returns the ones left for the form's fields.
   */
  const handle = (
    send: () => Promise<{ ok: true; delivery: CourierDeliveryDetail } | { ok: false; failure: ActionFailure }>,
    takeFieldErrors?: (fieldErrors: Record<string, string>) => Record<string, string>,
  ) =>
    singleFlight(async () => {
      setNotice(null);
      const result = await send();
      if (result.ok) {
        onSaved(result.delivery, text.success);
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
        const rest = takeFieldErrors ? takeFieldErrors(failure.fieldErrors) : failure.fieldErrors;
        const tookSome = Object.keys(rest).length < Object.keys(failure.fieldErrors).length;
        setNotice(tookSome && Object.keys(rest).length === 0
          ? null
          : applyFieldErrors({ ...failure, fieldErrors: rest }, setError, fields));
        return;
      }
      setNotice({ title: failure.title, message: failure.message });
    });

  return {
    text,
    notice,
    sendStatus: (body: StatusChangeRequest) => handle(() => submitStatus(delivery.parcelId, body)),
    sendUnableToCollect: (body: UnableToCollectRequest) =>
      handle(() => submitUnableToCollect(delivery.parcelId, body)),
    /** Any send that answers like an action (e.g. upload + DELIVERED), with the same guard and error handling. */
    sendWith: handle,
  };
}
