"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { useRegisterErrorHandler } from "../hooks/use-register-error-handler";
import { cooldownKeys, markCodeSent } from "../lib/cooldown";
import { verifyEmailHref } from "../lib/routes";
import {
  merchantRegisterSchema,
  type MerchantRegisterInput,
  type MerchantRegisterValues,
} from "../schemas";
import { EmailField } from "./email-field";
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

/**
 * Fields and order as in docs/design/02 Register.png. After sign-up the merchant confirms the email on
 * /verify-email, which then shows "Application received".
 */
export function MerchantRegisterForm() {
  const router = useRouter();
  const [redirecting, startRedirecting] = useLeavingPage();
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
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const { notice, clearNotice, handleError } = useRegisterErrorHandler(setError, FIELDS);

  const onSubmit = handleSubmit(async (values) => {
    clearNotice();
    try {
      const user = await authApi.register({ accountType: "MERCHANT", ...values });
      // No cookie: the email must be confirmed first, then an admin approves the application.
      startRedirecting();
      markCodeSent(cooldownKeys.verify(user.email));
      router.push(verifyEmailHref(user.email));
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
              <EmailField
                registration={register("email")}
                label="Business email"
                helper="Invoices and cash-on-delivery statements are sent here."
                placeholder="orders@yourbusiness.lk"
                error={errors.email?.message}
                onUseSuggestion={(email) => setValue("email", email, { shouldValidate: true })}
              />
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

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting || redirecting}>
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
