"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { PhoneField } from "@/components/auth/signup-fields";
import { TermsCheckbox } from "@/components/auth/terms-checkbox";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { useRegisterErrorHandler } from "@/components/auth/use-register-error-handler";
import { ROLE_HOME } from "@/lib/roles";
import { customerRegisterSchema, type CustomerRegisterValues } from "@/lib/validation";

const FIELDS = ["fullName", "phone", "email", "password", "acceptTerms"] as const;

export function CustomerRegisterForm() {
  const router = useRouter();
  const [redirecting, setRedirecting] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerRegisterValues>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "", acceptTerms: false },
  });

  const { notice, clearNotice, handleError } = useRegisterErrorHandler(setError, FIELDS);

  const onSubmit = handleSubmit(async (values) => {
    clearNotice();
    try {
      await authApi.register({ accountType: "CUSTOMER", ...values });
      // Customers are logged in straight away (the API sets the cookie).
      setRedirecting(true);
      router.replace(ROLE_HOME.CUSTOMER);
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

        <FormField id="email" label="Email" error={errors.email?.message}>
          {(a11y) => (
            <Input
              {...a11y}
              {...register("email")}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@example.com"
            />
          )}
        </FormField>

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
