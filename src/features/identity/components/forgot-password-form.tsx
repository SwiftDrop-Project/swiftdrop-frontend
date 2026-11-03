"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import { isApiError, retryMessage } from "@/lib/api";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { cooldownKeys, markCodeSent } from "../lib/cooldown";
import { resetPasswordHref } from "../lib/routes";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/**
 * /forgot-password. The API answers the same way whether or not an account matches, so this always
 * continues to /reset-password?email=…
 */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [notice, setNotice] = React.useState<string | null>(null);
  const [redirecting, startRedirecting] = useLeavingPage();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setNotice(null);
    const address = email.trim();
    try {
      // The API field is `identifier`; an email is one of the identifiers it accepts.
      await authApi.forgotPassword(address);
      markCodeSent(cooldownKeys.reset(address));
      startRedirecting();
      router.push(resetPasswordHref(address));
    } catch (error) {
      const fieldError = isApiError(error) && error.code === "VALIDATION_FAILED" ? error.fieldErrors.identifier : null;
      if (fieldError) {
        setError("email", { type: "server", message: fieldError }, { shouldFocus: true });
        return;
      }
      setNotice(
        isApiError(error)
          ? error.code === "TOO_MANY_REQUESTS"
            ? `Too many attempts from this device. ${retryMessage(error)}`
            : error.message
          : UNKNOWN_ERROR,
      );
    }
  });

  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">Reset your password</h1>
      <p className="mt-2 text-body text-grey-600">
        Enter the email address of your account. We&apos;ll email you a 6-digit code to set a new password.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {notice ? (
          <InlineNotice tone="error" title="We couldn't send a code">
            {notice}
          </InlineNotice>
        ) : null}

        <FormField id="email" label="Email address" error={errors.email?.message}>
          {(a11y) => (
            <Input
              {...a11y}
              {...register("email")}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@example.com"
              autoFocus
            />
          )}
        </FormField>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting || redirecting}>
          Send code
        </Button>

        <p className="text-body text-grey-600">
          Remembered it? <TextLink href="/login">Log in</TextLink>
        </p>
      </form>
    </div>
  );
}
