"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TermsCheckbox } from "@/components/auth/terms-checkbox";
import { useRegisterErrorHandler } from "@/components/auth/use-register-error-handler";
import { FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { PasswordInput } from "@/components/forms/password-input";
import { PhoneInput } from "@/components/forms/phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDistricts } from "@/hooks/use-districts";
import { authApi } from "@/lib/api";
import {
  merchantRegisterSchema,
  PARCELS_PER_MONTH_OPTIONS,
  type MerchantRegisterInput,
  type MerchantRegisterValues,
} from "@/lib/validation";

const FIELDS = [
  "businessName",
  "businessRegNo",
  "parcelsPerMonth",
  "contactPerson",
  "phone",
  "email",
  "pickupDistrict",
  "city",
  "password",
  "acceptTerms",
] as const;

export interface MerchantApplicationReceived {
  businessName: string;
  email: string;
}

/** Fields and order as in docs/design/02 Register.png. */
export function MerchantRegisterForm({
  onSuccess,
}: {
  onSuccess: (application: MerchantApplicationReceived) => void;
}) {
  const districts = useDistricts();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MerchantRegisterInput, unknown, MerchantRegisterValues>({
    resolver: zodResolver(merchantRegisterSchema),
    defaultValues: {
      businessName: "",
      businessRegNo: "",
      parcelsPerMonth: "",
      contactPerson: "",
      phone: "",
      email: "",
      pickupDistrict: "",
      city: "",
      password: "",
      acceptTerms: false,
    },
  });

  const { notice, clearNotice, handleError } = useRegisterErrorHandler(setError, FIELDS);

  const onSubmit = handleSubmit(async (values) => {
    clearNotice();
    try {
      const user = await authApi.register({ accountType: "MERCHANT", ...values });
      // Merchants get no cookie: they can log in once an admin approves them.
      onSuccess({ businessName: user.merchant?.businessName ?? values.businessName, email: user.email });
    } catch (error) {
      handleError(error);
    }
  });

  const districtPlaceholder =
    districts.status === "loading"
      ? "Loading districts…"
      : districts.status === "error"
        ? "Couldn't load districts"
        : "Select a district";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {notice}

      <div className="flex flex-col gap-5">
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
              <NativeSelect {...a11y} {...register("parcelsPerMonth")}>
                <option value="" disabled>
                  Select a range
                </option>
                {PARCELS_PER_MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>

        <FormField id="contactPerson" label="Contact person" error={errors.contactPerson?.message}>
          {(a11y) => (
            <Input {...a11y} {...register("contactPerson")} autoComplete="name" placeholder="Full name" />
          )}
        </FormField>

        <FormField id="phone" label="Mobile number" error={errors.phone?.message}>
          {(a11y) => <PhoneInput {...a11y} {...register("phone")} placeholder="77 123 4567" />}
        </FormField>

        <FormField
          id="email"
          label="Business email"
          helper="Invoices and cash-on-delivery statements are sent here."
          error={errors.email?.message}
        >
          {(a11y) => (
            <Input
              {...a11y}
              {...register("email")}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="orders@yourbusiness.lk"
            />
          )}
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <FormField
            id="pickupDistrict"
            label="Pickup district"
            error={errors.pickupDistrict?.message}
            helper={
              districts.status === "error" ? (
                <button
                  type="button"
                  onClick={districts.retry}
                  className="rounded-sm font-semibold text-orange-700 hover:text-orange-800 hover:underline"
                >
                  Try loading districts again
                </button>
              ) : undefined
            }
          >
            {(a11y) => (
              <NativeSelect
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
              </NativeSelect>
            )}
          </FormField>

          <FormField id="city" label="City or town" error={errors.city?.message}>
            {(a11y) => (
              <Input {...a11y} {...register("city")} autoComplete="address-level2" placeholder="e.g. Nugegoda" />
            )}
          </FormField>
        </div>

        <FormField
          id="password"
          label="Password"
          helper="At least 8 characters, including a number."
          error={errors.password?.message}
        >
          {(a11y) => <PasswordInput {...a11y} {...register("password")} autoComplete="new-password" />}
        </FormField>
      </div>

      <TermsCheckbox control={control} name="acceptTerms" />

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Create merchant account
      </Button>
    </form>
  );
}
