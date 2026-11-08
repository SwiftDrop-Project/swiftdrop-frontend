"use client";

import * as React from "react";
import { courierApi } from "../api";
import { describeCourierError, type CourierError } from "../lib/errors";
import type { CourierDeliveryDetail } from "../types";

export type CourierDeliveryState =
  | { status: "loading" }
  | { status: "error"; error: CourierError }
  | { status: "ready"; parcel: CourierDeliveryDetail };

/**
 * Loads one parcel (GET /courier/deliveries/{parcelId}) for the detail page and the delivered / failed forms.
 * `reload` fetches it again (after a 409); `setParcel` takes the parcel a status update returned.
 */
export function useCourierDelivery(parcelId: string) {
  const [state, setState] = React.useState<CourierDeliveryState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    courierApi
      .get(parcelId, controller.signal)
      .then((parcel) => setState({ status: "ready", parcel }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: describeCourierError(error, { loadingParcel: true }) });
      });
    return () => controller.abort();
  }, [parcelId, attempt]);

  const reload = React.useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  const setParcel = React.useCallback((parcel: CourierDeliveryDetail) => {
    setState({ status: "ready", parcel });
  }, []);

  return { state, reload, setParcel };
}
