"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { formatTrackingNumber, normalizeTrackingNumber } from "@/lib/format";
import { trackingSearchSchema, type TrackingSearchValues } from "../schemas";

/**
 * Tracking-number form. `hrefFor` builds the page to open for a (normalised) number, e.g. "/track/SD2611004817";
 * `onSearch` is used instead when given (the dispatchers' board shows the parcel on the same page).
 */
export function TrackingSearchForm({
  id = "trackingNumber",
  defaultValue = "",
  hrefFor,
  onSearch,
  submitLabel = "Track",
}: {
  id?: string;
  defaultValue?: string;
  hrefFor?: (trackingNumber: string) => string;
  onSearch?: (trackingNumber: string) => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackingSearchValues>({
    resolver: zodResolver(trackingSearchSchema),
    defaultValues: { trackingNumber: defaultValue ? formatTrackingNumber(defaultValue) : "" },
  });

  const onSubmit = handleSubmit((values) => {
    const number = normalizeTrackingNumber(values.trackingNumber);
    if (onSearch) onSearch(number);
    else if (hrefFor) router.push(hrefFor(number));
  });

  return (
    <form onSubmit={onSubmit} noValidate role="search" aria-label="Track a parcel">
      <FormField
        id={id}
        label="Tracking number"
        helper="Find it in the SMS or on the parcel label."
        error={errors.trackingNumber?.message}
      >
        {(a11y) => (
          <div className="flex gap-2">
            <Input
              {...a11y}
              {...register("trackingNumber")}
              placeholder="SD 2611 0048 17"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-10 tabular-nums"
            />
            <Button type="submit">{submitLabel}</Button>
          </div>
        )}
      </FormField>
    </form>
  );
}
