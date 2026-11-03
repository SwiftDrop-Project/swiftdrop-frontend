"use client";

import * as React from "react";
import { metaApi } from "@/lib/api";
import type { District } from "@/types";

type DistrictsState =
  | { status: "loading"; districts: District[] }
  | { status: "ready"; districts: District[] }
  | { status: "error"; districts: District[] };

/** Loads GET /meta/districts once per mount, with a retry for failures. */
export function useDistricts() {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<DistrictsState>({ status: "loading", districts: [] });

  React.useEffect(() => {
    const controller = new AbortController();
    metaApi
      .districts(controller.signal)
      .then((districts) => setState({ status: "ready", districts }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error", districts: [] });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = React.useCallback(() => {
    setState({ status: "loading", districts: [] });
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}
