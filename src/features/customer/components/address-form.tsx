"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TextButton } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/identity";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { formatPhone } from "@/lib/format";
import type { DistrictCode } from "@/types";
import { customerApi } from "../api";
import { addressSchema, type AddressFormData } from "../schemas";
import type { CustomerAddress } from "../types";

const FIELDS = [
  "label",
  "contactName",
  "phone",
  "addressLine",
  "city",
  "district",
  "postalCode",
  "landmark",
] as const;

function valuesOf(address: CustomerAddress): AddressFormData {
  return {
    label: address.label,
    contactName: address.contactName,
    phone: formatPhone(address.phone),
    addressLine: address.addressLine,
    city: address.city,
    district: address.district,
    postalCode: address.postalCode,
    landmark: address.landmark ?? "",
    useAsDefault: address.isDefault,
  };
}

/**
 * "Add address" or, with `address`, "Edit address" (POST or PUT /customer/addresses). A new address starts with the
 * customer's own name and mobile number, like the booking form; it becomes the default when the customer has none yet.
 * The parent gives it a `key` per address, so switching addresses starts a fresh form.
 */
export function AddressForm({
  address,
  hasDefault,
  districts,
  onSaved,
  onCancel,
}: {
  address?: CustomerAddress;
  /** The customer already has a default pickup address (a new one isn't ticked as default then). */
  hasDefault: boolean;
  /** The district list, loaded once by the page. */
  districts: ReturnType<typeof useDistricts>;
  onSaved: (saved: CustomerAddress) => void;
  onCancel: () => void;
}) {
  const user = useCurrentUser();
  const [notice, setNotice] = React.useState<string | null>(null);
  const editing = address !== undefined;
  const idPrefix = editing ? `address-${address.id}` : "address-new";

  const emptyValues: AddressFormData = {
    label: "",
    contactName: user?.fullName ?? "",
    phone: user?.phone ? formatPhone(user.phone) : "",
    addressLine: "",
    city: "",
    district: "",
    postalCode: "",
    landmark: "",
    useAsDefault: !hasDefault,
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: editing ? valuesOf(address) : emptyValues,
  });

  // The logged-in user may arrive after the form: fill the customer's own name and mobile then, unless typed already.
  const userName = user?.fullName;
  const userPhone = user?.phone;
  React.useEffect(() => {
    if (editing) return;
    if (userName && getValues("contactName") === "") setValue("contactName", userName);
    if (userPhone && getValues("phone") === "") setValue("phone", formatPhone(userPhone));
  }, [editing, userName, userPhone, getValues, setValue]);

  async function onSubmit(data: AddressFormData) {
    setNotice(null);
    const body = {
      label: data.label.trim(),
      contactName: data.contactName.trim(),
      phone: data.phone.trim(),
      addressLine: data.addressLine.trim(),
      city: data.city.trim(),
      district: data.district as DistrictCode,
      postalCode: data.postalCode.trim(),
      landmark: data.landmark.trim() || undefined,
      useAsDefault: data.useAsDefault,
    };
    try {
      const saved = editing
        ? await customerApi.updateAddress(address.id, body)
        : await customerApi.createAddress(body);
      toast({
        tone: "success",
        title: editing ? "Address updated" : "Address saved",
        description: `“${saved.label}” is ready to use when you create a delivery.`,
      });
      if (!editing) reset(emptyValues);
      onSaved(saved);
    } catch (error) {
      if (isApiError(error)) {
        const { handled } = applyServerFieldErrors(error, setError, FIELDS);
        setNotice(handled ? "Check the fields marked below." : error.message);
      } else {
        setNotice("We couldn't save the address. Try again in a moment.");
      }
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-h3 font-semibold text-grey-900">{editing ? "Edit address" : "Add address"}</h2>

        {notice ? (
          <InlineNotice tone="error" title="We couldn't save the address" className="mt-4">
            {notice}
          </InlineNotice>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 flex flex-col gap-5">
          <FormField id={`${idPrefix}-label`} label="Label" error={errors.label?.message}>
            {(a11y) => (
              <Input {...a11y} {...register("label")} size="md" placeholder="Home, Shop, Office" maxLength={40} />
            )}
          </FormField>

          <FormField id={`${idPrefix}-contactName`} label="Contact name" error={errors.contactName?.message}>
            {(a11y) => (
              <Input {...a11y} {...register("contactName")} size="md" placeholder="Full name" autoComplete="name" />
            )}
          </FormField>

          <FormField id={`${idPrefix}-phone`} label="Mobile number" error={errors.phone?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...register("phone")}
                type="tel"
                size="md"
                placeholder="077 123 4567"
                autoComplete="tel"
                className="tabular-nums"
              />
            )}
          </FormField>

          <FormField id={`${idPrefix}-addressLine`} label="Address line" error={errors.addressLine?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...register("addressLine")}
                size="md"
                placeholder="House number and street"
                autoComplete="street-address"
              />
            )}
          </FormField>

          <FormField id={`${idPrefix}-city`} label="City" error={errors.city?.message}>
            {(a11y) => (
              <Input {...a11y} {...register("city")} size="md" placeholder="Nugegoda" autoComplete="address-level2" />
            )}
          </FormField>

          <FormField
            id={`${idPrefix}-district`}
            label="District"
            error={errors.district?.message}
            helper={
              districts.status === "error" ? (
                <TextButton onClick={districts.retry}>Try loading districts again</TextButton>
              ) : undefined
            }
          >
            {(a11y) => (
              // Controlled: the districts arrive after the form is filled, and an uncontrolled select would then
              // show the first district instead of the address's own.
              <Controller
                control={control}
                name="district"
                render={({ field }) => (
                  <Select
                    {...a11y}
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    size="md"
                    disabled={districts.status !== "ready"}
                  >
                    <option value="" disabled>
                      {districts.status === "loading" ? "Loading districts…" : "Select district"}
                    </option>
                    {districts.districts.map((district) => (
                      <option key={district.code} value={district.code}>
                        {district.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            )}
          </FormField>

          <FormField id={`${idPrefix}-postalCode`} label="Postal code" error={errors.postalCode?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...register("postalCode")}
                size="md"
                inputMode="numeric"
                placeholder="10250"
                maxLength={5}
                autoComplete="postal-code"
                className="tabular-nums"
              />
            )}
          </FormField>

          <FormField id={`${idPrefix}-landmark`} label="Landmark (optional)" error={errors.landmark?.message}>
            {(a11y) => (
              <Input {...a11y} {...register("landmark")} size="md" placeholder="Near the school gate" maxLength={150} />
            )}
          </FormField>

          <Controller
            control={control}
            name="useAsDefault"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`${idPrefix}-useAsDefault`}
                  ref={field.ref}
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                />
                <label htmlFor={`${idPrefix}-useAsDefault`} className="cursor-pointer text-body text-grey-700">
                  Use as my default pickup address
                </label>
              </div>
            )}
          />

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              {editing ? "Save changes" : "Save address"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => {
                setNotice(null);
                reset(editing ? valuesOf(address) : emptyValues);
                onCancel();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
