"use client";

import * as React from "react";
import { useFormContext, useFormState, type UseFormRegisterReturn } from "react-hook-form";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { TextButton } from "@/components/ui/text-link";
import { useDistricts } from "@/hooks/use-districts";
import { PARCELS_PER_MONTH_OPTIONS } from "@/lib/reference";
import type { MerchantCompleteProfileInput } from "../schemas";

/*
 * Fields shared by /register and /register/complete (after a Google sign-up), so both forms
 * look and behave the same. Validation lives in the zod schemas in ../schemas.ts.
 */

/** "Mobile number" with the +94 prefix. */
export function PhoneField({ registration, error }: { registration: UseFormRegisterReturn; error?: string }) {
  return (
    <FormField id="phone" label="Mobile number" error={error}>
      {(a11y) => <PhoneInput {...a11y} {...registration} placeholder="77 123 4567" />}
    </FormField>
  );
}

/**
 * The merchant's business, contact and pickup fields in the order of docs/design/02 Register.png.
 * Use inside a react-hook-form FormProvider whose values include these fields.
 * `afterPhone` is where /register puts the business email.
 */
export function MerchantDetailsFields({ afterPhone }: { afterPhone?: React.ReactNode }) {
  const { register, control } = useFormContext<MerchantCompleteProfileInput>();
  const { errors } = useFormState({ control });
  const districts = useDistricts();

  const districtPlaceholder =
    districts.status === "loading"
      ? "Loading districts…"
      : districts.status === "error"
        ? "Couldn't load districts"
        : "Select a district";

  return (
    <>
      <FormField id="businessName" label="Business name" error={errors.businessName?.message}>
        {(a11y) => (
          <Input
            {...a11y}
            {...register("businessName")}
            autoComplete="organization"
            placeholder="As shown on your invoices"
          />
        )}
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <FormField
          id="businessRegNo"
          label="Business reg. no."
          labelHint="(optional)"
          error={errors.businessRegNo?.message}
        >
          {(a11y) => <Input {...a11y} {...register("businessRegNo")} placeholder="PV 00000000" />}
        </FormField>

        <FormField id="parcelsPerMonth" label="Parcels per month" error={errors.parcelsPerMonth?.message}>
          {(a11y) => (
            <Select {...a11y} {...register("parcelsPerMonth")}>
              <option value="" disabled>
                Select a range
              </option>
              {PARCELS_PER_MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <FormField id="contactPerson" label="Contact person" error={errors.contactPerson?.message}>
        {(a11y) => (
          <Input {...a11y} {...register("contactPerson")} autoComplete="name" placeholder="Full name" />
        )}
      </FormField>

      <PhoneField registration={register("phone")} error={errors.phone?.message} />

      {afterPhone}

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <FormField
          id="pickupDistrict"
          label="Pickup district"
          error={errors.pickupDistrict?.message}
          helper={
            districts.status === "error" ? (
              <TextButton onClick={districts.retry}>Try loading districts again</TextButton>
            ) : undefined
          }
        >
          {(a11y) => (
            <Select
              {...a11y}
              {...register("pickupDistrict")}
              disabled={districts.status !== "ready"}
              autoComplete="address-level1"
            >
              <option value="" disabled>
                {districtPlaceholder}
              </option>
              {districts.districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField id="city" label="City or town" error={errors.city?.message}>
          {(a11y) => (
            <Input {...a11y} {...register("city")} autoComplete="address-level2" placeholder="e.g. Nugegoda" />
          )}
        </FormField>
      </div>
    </>
  );
}
