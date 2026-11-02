"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authApi } from "../api";
import { useRegisterErrorHandler } from "../hooks/use-register-error-handler";
import {
  merchantRegisterSchema,
  type MerchantRegisterInput,
  type MerchantRegisterValues,
} from "../schemas";
import type { MerchantApplicationReceived } from "./application-received";
import { GoogleSignIn } from "./google-sign-in";
import { MerchantDetailsFields } from "./signup-fields";
import { TermsCheckbox } from "./terms-checkbox";

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

/** Fields and order as in docs/design/02 Register.png. */
export function MerchantRegisterForm({
  onSuccess,
}: {
  onSuccess: (application: MerchantApplicationReceived) => void;
}) {
  const form = useForm<MerchantRegisterInput, unknown, MerchantRegisterValues>({
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
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form;

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

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {notice}

        <div className="flex flex-col gap-5">
          <MerchantDetailsFields
            afterPhone={
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
            }
          />

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

        <GoogleSignIn
          accountType="merchant"
          helper="You'll add your business and pickup details after signing in with Google."
        />
      </form>
    </FormProvider>
  );
}
