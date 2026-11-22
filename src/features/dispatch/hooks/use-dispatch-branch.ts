"use client";

import * as React from "react";
import { useDistricts } from "@/hooks/use-districts";
import { humanizeCode } from "@/lib/format";
import type { DistrictCode } from "@/types";

/*
 * The branch the dispatcher is working on. Remembered in this browser (localStorage: a convenience only, never
 * anything secret), so every dispatch page opens on the same branch.
 */

const STORAGE_KEY = "swiftdrop.dispatch.branch";
const DEFAULT_BRANCH: DistrictCode = "COLOMBO";

const listeners = new Set<() => void>();
let memory: DistrictCode | null = null;

function read(): DistrictCode {
  if (memory) return memory;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_BRANCH;
  } catch {
    return DEFAULT_BRANCH;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(branch: DistrictCode) {
  memory = branch;
  try {
    window.localStorage.setItem(STORAGE_KEY, branch);
  } catch {
    // Private mode or blocked storage: the choice still holds until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
}

/** [branch, setBranch]: the remembered branch (Colombo at first). */
export function useDispatchBranch(): [DistrictCode, (branch: DistrictCode) => void] {
  const branch = React.useSyncExternalStore(subscribe, read, () => DEFAULT_BRANCH);
  return [branch, write];
}

/** District names from GET /meta/districts, with a readable fallback while they load. */
export function useDistrictName() {
  const districts = useDistricts();
  const name = React.useCallback(
    (code: DistrictCode | null | undefined) => {
      if (!code) return "—";
      return districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code);
    },
    [districts.districts],
  );
  return { districts, name };
}
