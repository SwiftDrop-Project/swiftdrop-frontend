"use client";

import * as React from "react";
import { isApiError } from "@/lib/api";
import { customerApi } from "../api";
import type { CustomerAddress } from "../types";

export type AddressesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; addresses: CustomerAddress[] };

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/**
 * GET /customer/addresses. `reload` fetches the list again after a change (save, make default, delete) without
 * showing the loading state, so the page doesn't jump; a request that is no longer wanted is cancelled.
 */
export function useAddresses() {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<AddressesState>({ status: "loading" });

  React.useEffect(() => {
    const controller = new AbortController();
    customerApi
      .getAddresses(controller.signal)
      .then((addresses) => setState({ status: "ready", addresses }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: isApiError(error) ? error.message : UNKNOWN_ERROR });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = React.useCallback(() => setAttempt((value) => value + 1), []);
  return { state, reload };
}
