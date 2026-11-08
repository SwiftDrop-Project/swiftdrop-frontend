"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "@/components/ui/toast";
import { isApiError, type ApiError } from "@/lib/api";
import { CONFLICT_TITLE, describeCourierError, NOT_FOUND_TITLE, UNAVAILABLE_TITLE } from "../lib/errors";
import { courierRoutes } from "../lib/labels";

export interface SubmitNotice {
  tone: "info" | "error";
  title: string;
  body: string;
}

export const SAVE_ERROR_TITLE = "We couldn't save this update";

/**
 * What the Mark as delivered / Mark as failed forms do when the status update fails:
 * - 409: toast, then the parcel page (which loads the new status)
 * - 404: toast, then today's deliveries
 * - 400: field errors via `applyFieldErrors`; anything it can't place goes in the notice
 * - 503 and the rest: a notice at the top of the form
 */
export function useStatusSubmitError(parcelId: string) {
  const router = useRouter();
  const [notice, setNotice] = React.useState<SubmitNotice | null>(null);

  const handleError = React.useCallback(
    (error: unknown, applyFieldErrors: (error: ApiError) => { handled: boolean; unmatched: string[] }) => {
      const described = describeCourierError(error);
      switch (described.kind) {
        case "conflict":
          toast({ tone: "error", title: CONFLICT_TITLE, description: described.message });
          router.replace(courierRoutes.parcel(parcelId));
          return;
        case "not-found":
          toast({ tone: "error", title: NOT_FOUND_TITLE });
          router.replace(courierRoutes.today);
          return;
        case "validation": {
          if (!isApiError(error)) break;
          const { handled, unmatched } = applyFieldErrors(error);
          if (handled && unmatched.length === 0) return;
          setNotice({ tone: "error", title: SAVE_ERROR_TITLE, body: unmatched.join(" ") || described.message });
          return;
        }
        case "unavailable":
          setNotice({ tone: "info", title: UNAVAILABLE_TITLE, body: described.message });
          return;
      }
      setNotice({ tone: "error", title: SAVE_ERROR_TITLE, body: described.message });
    },
    [parcelId, router],
  );

  return { notice, setNotice, handleError };
}
