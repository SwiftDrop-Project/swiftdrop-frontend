"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { useRegisterErrorHandler } from "../hooks/use-register-error-handler";
import { cooldownKeys, markCodeSent } from "../lib/cooldown";
import { verifyEmailHref } from "../lib/routes";
import { customerRegisterSchema, type CustomerRegisterValues } from "../schemas";
import { EmailField } from "./email-field";
import { GoogleSignIn } from "./google-sign-in";
import { PhoneField } from "./signup-fields";
import { TermsCheckbox } from "./terms-checkbox";

const FIELDS = ["fullName", "phone", "email", "password", "acceptTerms"] as const;

export function CustomerRegisterForm() {
  const router = useRouter();
  const [redirecting, startRedirecting] = useLeavingPage();

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerRegisterValues>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "", acceptTerms: false },
  });

  const { notice, clearNotice, handleError } = useRegisterErrorHandler(setError, FIELDS);

  const onSubmit = handleSubmit(async (values) => {
    clearNotice();
    try {
      const user = await authApi.register({ accountType: "CUSTOMER", ...values });
      // No cookie yet: the account is PENDING_EMAIL_VERIFICATION and a 6-digit code was emailed.
      startRedirecting();
      markCodeSent(cooldownKeys.verify(user.email));
      router.push(verifyEmailHref(user.email));
    } catch (error) {
      handleError(error);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {notice}

      <div className="flex flex-col gap-5">
        <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
          {(a11y) => <Input {...a11y} {...register("fullName")} autoComplete="name" />}
        </FormField>

        <PhoneField registration={register("phone")} error={errors.phone?.message} />

        <EmailField
          registration={register("email")}
          error={errors.email?.message}
          onUseSuggestion={(email) => setValue("email", email, { shouldValidate: true })}
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
        Create account
      </Button>

      <GoogleSignIn accountType="customer" />
    </form>
  );
}
