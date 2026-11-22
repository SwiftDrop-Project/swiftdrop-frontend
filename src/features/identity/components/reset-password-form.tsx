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
import { formatPhone } from "@/lib/format";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { email as emailRule } from "@/lib/validation";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { useHydrated } from "../hooks/use-query-param";
import { codeErrorNotice } from "../lib/code-errors";
import { cooldownKeys, formatCountdown, markCodeSent, useCooldown } from "../lib/cooldown";
import { maskEmail } from "../lib/email";
import { clearRecoveryFlow, readRecoveryFlow, type RecoveryFlow } from "../lib/recovery-flow";
import { forgotPasswordHref, loginHref, PASSWORD_UPDATED_LOGIN } from "../lib/routes";
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";
const CODE_INPUT_ID = "code";

interface Notice {
  tone: "success" | "error";
  title: string;
  body: string;
}

type ResetTarget =
  | {
    bound: false;
    /** Email used for both API calls and display (standalone /reset-password?email=…). */
    accountIdentifier: string;
    displayEmail: string;
  }
  | {
    bound: true;
    flowId: string;
    flow: RecoveryFlow;
    /** Account identifier sent to /auth/password/forgot (resend) and /auth/password/reset. */
    accountIdentifier: string;
    /** Email shown (masked) to the user; distinct from `accountIdentifier` when recovering by mobile. */
    displayEmail: string;
    /** Confirmation email repeated on resend for phone-initiated recovery. */
    confirmationEmail?: string;
  };

/**
 * /reset-password:
 * - Bound login flow (?flow=…): stays locked to the account chosen on /login (email or mobile + confirmation email).
 * - Standalone route (?email=…): preserves direct / independent email recovery.
 * Missing or invalid context restarts safely at /forgot-password.
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
 * Reads ?flow= / ?email= from the router (not window.location: on a client-side navigation from /forgot-password
 * the new page renders before the browser URL changes).
 */
function ResetPasswordFromUrl() {
  const router = useRouter();
  const hydrated = useHydrated();
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flow")?.trim() ?? "";
  const urlEmail = searchParams.get("email")?.trim() ?? "";

  const flow = hydrated && flowId ? readRecoveryFlow(flowId) : null;
  const boundNeedsRestart = hydrated && Boolean(flowId) && flow === null;
  const boundNeedsSend =
    hydrated && Boolean(flowId) && flow !== null && (!flow.codeSent || !flow.displayEmail);
  const standaloneValid = !flowId && emailRule.safeParse(urlEmail).success;

  React.useEffect(() => {
  if (boundNeedsRestart) {
    router.replace("/forgot-password");
    return;
  }
  if (boundNeedsSend) {
    router.replace(forgotPasswordHref(flowId));
    return;
  }
  if (!flowId && !standaloneValid) {
    router.replace("/forgot-password");
  }
}, [boundNeedsRestart, boundNeedsSend, flowId, standaloneValid, router]);

  if (flowId) {
    if (!hydrated || !flow || !flow.codeSent || !flow.displayEmail) {
      return <Title />;
    }
    const target: ResetTarget = {
      bound: true,
      flowId,
      flow,
      accountIdentifier: flow.identifier,
      displayEmail: flow.displayEmail,
      confirmationEmail: flow.kind === "bound-phone" ? (flow.confirmationEmail ?? undefined) : undefined,
    };
    return <ResetForm key={`${flowId}:${flow.displayEmail}`} target={target} />;
  }

  if (!standaloneValid) {
    return <Title />;
  }
  return (
    <ResetForm
      key={urlEmail}
      target={{ bound: false, accountIdentifier: urlEmail, displayEmail: urlEmail }}
    />
  );
}

  function Title({ displayEmail, boundPhone }: { displayEmail?: string; boundPhone?: string }) {
    return (
      <>
        <h1 className="text-display text-grey-900">Set a new password</h1>
        <p className="mt-2 text-body text-grey-600">
            { displayEmail && boundPhone ? (
              <>
                If the details match an account for{" "}
                <span className="font-semibold text-grey-900 tabular-nums">{formatPhone(boundPhone)}</span>, we&apos;ve
                sent a 6-digit code to{" "}
                <span className="font-semibold text-grey-900">{maskEmail(displayEmail)}</span>. Enter it below and choose a
                new password.
              </>
            ) : displayEmail ? (
              <>
                If the details match an account, we&apos;ve sent a 6-digit code to{" "}
                <span className="font-semibold text-grey-900">{maskEmail(displayEmail)}</span>. Enter it below and choose a
                new password.
              </>
            ) : (
              "Enter the 6-digit code from the email and choose a new password."
            )}
        </p>
      </>
    );
  }

    function ResetForm({ target }: { target: ResetTarget }) {
      const router = useRouter();
      const [notice, setNotice] = React.useState<Notice | null>(null);
      const [redirecting, startRedirecting] = useLeavingPage();
      const [resending, setResending] = React.useState(false);

      const confirmationEmail = target.bound ? target.confirmationEmail : undefined;
      const boundPhone = target.bound && target.flow.kind === "bound-phone" ? target.flow.identifier : undefined;
      const resendIn = useCooldown(cooldownKeys.reset(target.accountIdentifier, confirmationEmail));

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
          await authApi.resetPassword({
            identifier: target.accountIdentifier,
            code: values.code,
            newPassword: values.newPassword,
          });
          if (target.bound) {
            clearRecoveryFlow(target.flowId);
          }
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
          await authApi.forgotPassword(
            confirmationEmail
              ? { identifier: target.accountIdentifier, confirmationEmail }
              : { identifier: target.accountIdentifier },
          );
          markCodeSent(cooldownKeys.reset(target.accountIdentifier, confirmationEmail));
          setValue("code", "");
          setNotice({
            tone: "success",
            title: "Code requested",
            body: `If the details match an account, we've sent a new code to ${maskEmail(target.displayEmail)}. Only the newest code works.`,
          });
          document.getElementById(CODE_INPUT_ID)?.focus();
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
          <Title displayEmail={target.displayEmail} boundPhone={boundPhone} />

          <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
            {notice ? (
              <InlineNotice tone={notice.tone} title={notice.title}>
                {notice.body}
              </InlineNotice>
            ) : null}

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <FormField
                  id={CODE_INPUT_ID}
                  label="Code from the email"
                  helper="The code works for 10 minutes. Check your spam folder if you can't find the email."
                  error={errors.code?.message}
                >
                  {(a11y) => (
                    <Controller
                      name="code"
                      control={control}
                      render={({ field }) => (
                    <CodeInput
                      {...a11y}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      autoFocus
                    />
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
              {target.bound ? (
                target.flow.kind === "bound-phone" ? (
                  <>
                    <p>
                      Entered the wrong email?{" "}
                      <TextLink href={forgotPasswordHref(target.flowId)}>Re-enter email</TextLink>
                    </p>
                    <p>
                      Wrong mobile number?{" "}
                      <TextLink href={loginHref(target.flow.loginIdentifier)}>Back to login</TextLink>
                    </p>
                  </>
                ) : (
                  <p>
                    Wrong account?{" "}
                    <TextLink href={loginHref(target.flow.loginIdentifier)}>Back to login</TextLink>
                  </p>
                )
              ) : (
                <p>
                  Wrong email? <TextLink href="/forgot-password">Use a different email</TextLink>
                </p>
              )}
              <p>
                Remembered it? <TextLink href="/login">Log in</TextLink>
              </p>
            </div>
          </form>
        </div>
      );
    }
