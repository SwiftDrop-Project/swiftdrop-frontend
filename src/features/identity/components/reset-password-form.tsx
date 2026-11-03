"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { PasswordInput } from "@/components/ui/password-input";
import { TextButton, TextLink } from "@/components/ui/text-link";
import { isApiError, retryMessage } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { email as emailRule } from "@/lib/validation";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { codeErrorNotice } from "../lib/code-errors";
import { cooldownKeys, formatCountdown, markCodeSent, useCooldown } from "../lib/cooldown";
import { maskEmail } from "../lib/email";
import { PASSWORD_UPDATED_LOGIN } from "../lib/routes";
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

interface Notice {
  tone: "success" | "error";
  title: string;
  body: string;
}

/**
 * /reset-password?email=…: the code from the reset email plus a new password. Without ?email= it goes back
 * to /forgot-password. Success logs the account out everywhere and goes to /login with "Password updated".
 */
export function ResetPasswordForm() {
  // useSearchParams suspends while the page is prerendered; the title shows until the URL can be read.
  return (
    <React.Suspense fallback={<Title />}>
      <ResetPasswordFromUrl />
    </React.Suspense>
  );
}

/**
 * Reads ?email= from the router (not window.location: on a client-side navigation from /forgot-password the
 * new page renders before the browser URL changes, so window.location would still have no email).
 */
function ResetPasswordFromUrl() {
  const router = useRouter();
  const email = useSearchParams().get("email")?.trim() ?? "";
  const valid = emailRule.safeParse(email).success;

  React.useEffect(() => {
    if (!valid) router.replace("/forgot-password");
  }, [valid, router]);

  if (!valid) {
    return <Title />;
  }
  return <ResetForm key={email} email={email} />;
}

function Title({ email }: { email?: string }) {
  return (
    <>
      <h1 className="text-display text-grey-900">Set a new password</h1>
      <p className="mt-2 text-body text-grey-600">
        {email ? (
          <>
            We sent a 6-digit code to <span className="font-semibold text-grey-900">{maskEmail(email)}</span>.
            Enter it below and choose a new password.
          </>
        ) : (
          "Enter the 6-digit code from the email and choose a new password."
        )}
      </p>
    </>
  );
}

function ResetForm({ email }: { email: string }) {
  const router = useRouter();
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [redirecting, startRedirecting] = useLeavingPage();
  const [resending, setResending] = React.useState(false);
  const resendIn = useCooldown(cooldownKeys.reset(email));

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      await authApi.resetPassword({ identifier: email, code: values.code, newPassword: values.newPassword });
      startRedirecting();
      router.replace(PASSWORD_UPDATED_LOGIN);
    } catch (error) {
      if (isApiError(error) && error.code === "VALIDATION_FAILED") {
        const { handled, unmatched } = applyServerFieldErrors(error, setError, ["code", "newPassword"]);
        if (handled && unmatched.length === 0) return;
      }
      const { title, body } = codeErrorNotice(error);
      setNotice({ tone: "error", title, body });
      if (isApiError(error) && ["INVALID_CODE", "CODE_EXPIRED", "TOO_MANY_ATTEMPTS"].includes(error.code)) {
        setValue("code", "");
        setError("code", { type: "server", message: "Enter the newest code from the email." }, { shouldFocus: true });
      }
    }
  });

  async function resend() {
    setResending(true);
    setNotice(null);
    try {
      await authApi.forgotPassword(email);
      markCodeSent(cooldownKeys.reset(email));
      setValue("code", "");
      setNotice({
        tone: "success",
        title: "We sent a new code",
        body: `Check ${maskEmail(email)}. Only the newest code works.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "We couldn't send a new code",
        body: isApiError(error)
          ? error.code === "TOO_MANY_REQUESTS"
            ? retryMessage(error)
            : error.message
          : UNKNOWN_ERROR,
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Title email={email} />

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {notice ? (
          <InlineNotice tone={notice.tone} title={notice.title}>
            {notice.body}
          </InlineNotice>
        ) : null}

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <FormField
              id="code"
              label="Code from the email"
              helper="The code works for 10 minutes. Check your spam folder if you can't find the email."
              error={errors.code?.message}
            >
              {(a11y) => (
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <CodeInput {...a11y} name={field.name} value={field.value} onChange={field.onChange} autoFocus />
                  )}
                />
              )}
            </FormField>
            <p className="text-body-sm text-grey-600">
              {resendIn > 0 ? (
                <>You can ask for a new code in {formatCountdown(resendIn)}.</>
              ) : (
                <>
                  Didn&apos;t get it?{" "}
                  <TextButton onClick={() => void resend()} disabled={resending}>
                    Resend code
                  </TextButton>
                </>
              )}
            </p>
          </div>

          <FormField
            id="newPassword"
            label="New password"
            helper="At least 8 characters, including a number."
            error={errors.newPassword?.message}
          >
            {(a11y) => <PasswordInput {...a11y} {...register("newPassword")} autoComplete="new-password" />}
          </FormField>

          <FormField id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
            {(a11y) => <PasswordInput {...a11y} {...register("confirmPassword")} autoComplete="new-password" />}
          </FormField>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting || redirecting}>
          Update password
        </Button>

        <div className="flex flex-col gap-2 text-body text-grey-600">
          <p>
            Wrong email? <TextLink href="/forgot-password">Use a different email</TextLink>
          </p>
          <p>
            Remembered it? <TextLink href="/login">Log in</TextLink>
          </p>
        </div>
      </form>
    </div>
  );
}
