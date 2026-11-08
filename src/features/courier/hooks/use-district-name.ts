"use client";

import * as React from "react";
import { useDistricts } from "@/hooks/use-districts";
import { humanizeCode } from "@/lib/format";

/** "NUWARA_ELIYA" → "Nuwara Eliya", from GET /meta/districts (or the code itself until it loads). Call once per screen. */
export function useDistrictName(): (code: string) => string {
  const { districts } = useDistricts();
  return React.useCallback(
    (code: string) => districts.find((district) => district.code === code)?.name ?? humanizeCode(code),
    [districts],
  );
}
