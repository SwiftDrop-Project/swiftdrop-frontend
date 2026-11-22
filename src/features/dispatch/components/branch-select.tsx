"use client";

import { Select } from "@/components/ui/select";
import type { DistrictCode } from "@/types";
import { useDistrictName } from "../hooks/use-dispatch-branch";

/**
 * Branch picker for dispatch toolbars (25 districts, A–Z). With `allLabel`, the first option means "every branch"
 * and gives "".
 */
export function BranchSelect({
  id,
  value,
  onChange,
  allLabel,
  label = "Branch",
}: {
  id: string;
  value: DistrictCode | "";
  onChange: (branch: DistrictCode | "") => void;
  allLabel?: string;
  label?: string;
}) {
  const { districts, name } = useDistrictName();
  const options = [...districts.districts].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="w-full sm:w-56">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select id={id} size="md" value={value} onChange={(event) => onChange(event.target.value)}>
        {allLabel ? <option value="">{allLabel}</option> : null}
        {/* Keep the chosen branch visible while the list loads. */}
        {value && !options.some((district) => district.code === value) ? (
          <option value={value}>{name(value)}</option>
        ) : null}
        {options.map((district) => (
          <option key={district.code} value={district.code}>
            {district.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
