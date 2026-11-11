"use client";

import * as React from "react";
import { Select } from "@/components/ui/select";
import type { DistrictCode } from "@/types";
import type { CourierWorkload } from "../types";

/**
 * Native select of active couriers with how many parcels each still has, least busy first. Spread the
 * FormField a11y props and react-hook-form's register() onto it.
 */
export const CourierSelect = React.forwardRef<
  HTMLSelectElement,
  Omit<React.ComponentProps<typeof Select>, "children"> & {
    couriers: CourierWorkload[] | undefined;
    loading: boolean;
    branchName: string;
    excludeId?: string;
  }
>(function CourierSelect({ couriers, loading, branchName, excludeId, ...props }, ref) {
  const available = (couriers ?? []).filter((courier) => courier.courierId !== excludeId);
  const placeholder = loading
    ? "Loading couriers…"
    : available.length === 0
      ? `No active couriers at ${branchName}`
      : "Select a courier";
  return (
    <Select ref={ref} size="md" {...props}>
      <option value="" disabled>
        {placeholder}
      </option>
      {available.map((courier) => (
        <option key={courier.courierId} value={courier.courierId}>
          {courier.fullName} · {courier.openParcels} {courier.openParcels === 1 ? "parcel" : "parcels"} open
        </option>
      ))}
    </Select>
  );
});

/** Which branch's couriers do a task: the pickup branch for pickups, the branch the parcels leave from otherwise. */
export function courierBranch(type: string, origin: DistrictCode | null, destination: DistrictCode | null) {
  return (type === "PICKUP" ? destination : origin) ?? "";
}
