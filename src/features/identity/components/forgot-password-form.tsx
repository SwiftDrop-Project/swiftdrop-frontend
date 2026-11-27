"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import { isApiError, retryMessage } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { useHydrated } from "../hooks/use-query-param";
import { cooldownKeys, markCodeSent } from "../lib/cooldown";
import {
  readRecoveryFlow,
  updateRecoveryFlow,
  type RecoveryFlow,
} from "../lib/recovery-flow";
import { loginHref, resetPasswordFlowHref, resetPasswordHref } from "../lib/routes";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

function formatSendError(error: unknown): string {
  if (!isApiError(error)) return UNKNOWN_ERROR;
  return error.code === "TOO_MANY_REQUESTS"
    ? `Too many attempts from this device. ${retryMessage(error)}`
    : error.message;
}

/**
 * /forgot-password:
 * - Direct / empty-login entry (no ?flow=): editable email-only recovery -> /reset-password?email=…
 * - Bound email from /login (?flow=…): read-only confirmation with explicit "Send code" and "Back to login".
 * - Bound phone from /login (?flow=…): shows the mobile number read-only and asks for the registered email,
 *   sending both to POST /auth/password/forgot for server-side verification.
 */
export function ForgotPasswordForm() {
  return (
    <React.Suspense fallback={<Heading />}>
      <ForgotPasswordFromUrl />
    </React.Suspense>
  );
}

function Heading({ description }: { description?: string }) {
  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">Reset your password</h1>
      {description ? <p className="mt-2 text-body text-grey-600">{description}</p> : null}
    </div>
  );
}

function ForgotPasswordFromUrl() {
  const router = useRouter();
  const hydrated = useHydrated();
  const flowId = useSearchParams().get("flow")?.trim() ?? "";
  const flow = hydrated && flowId ? readRecoveryFlow(flowId) : null;
  const missingBoundContext = hydrated && Boolean(flowId) && flow === null;

  React.useEffect(() => {
    if (missingBoundContext) {
      router.replace("/forgot-password");
    }
  }, [missingBoundContext, router]);

  if (!flowId) {
    return <UnboundForgotForm />;
  }
  if (!hydrated || !flow) {
    return <Heading />;
  }
  if (flow.kind === "bound-email") {
    return <BoundEmailForgotForm key={flowId} flowId={flowId} flow={flow} />;
  }
  return <BoundPhoneForgotForm key={flowId} flowId={flowId} flow={flow} />;
}

/** Existing independent editable email-only recovery flow. */
function UnboundForgotForm() {
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
      await authApi.forgotPassword({ identifier: address });
      markCodeSent(cooldownKeys.reset(address));
      startRedirecting();
      router.push(resetPasswordHref(address));
    } catch (error) {
      const fieldError = isApiError(error) && error.code === "VALIDATION_FAILED" ? error.fieldErrors.identifier : null;
      if (fieldError) {
        setError("email", { type: "server", message: fieldError }, { shouldFocus: true });
        return;
      }
      setNotice(formatSendError(error));
    }
  });

  return (
    <div className="flex flex-col">
      <Heading description="Enter the email address of your account. If it matches an account, we'll email you a 6-digit code to set a new password." />

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

/** Bound email recovery started from /login: read-only email, explicit Send code, Back to login to edit. */
function BoundEmailForgotForm({
  flowId,
  flow,
}: {
  flowId: string;
  flow: Extract<RecoveryFlow, { kind: "bound-email" }>;
}) {
  const router = useRouter();
  const [notice, setNotice] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [redirecting, startRedirecting] = useLeavingPage();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || redirecting) return;
    setNotice(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ identifier: flow.identifier });
      markCodeSent(cooldownKeys.reset(flow.identifier));
      updateRecoveryFlow(flowId, { ...flow, codeSent: true });
      startRedirecting();
      router.push(resetPasswordFlowHref(flowId));
    } catch (error) {
      setNotice(formatSendError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Heading description="If this email matches an account, we'll send a 6-digit code to its registered email so you can set a new password." />

      <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-8 flex flex-col gap-6">
        {notice ? (
          <InlineNotice tone="error" title="We couldn't send a code">
            {notice}
          </InlineNotice>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <span className="text-label text-grey-900">Email address</span>
          <p
            data-testid="bound-email"
            className="break-all rounded-md border border-grey-200 bg-grey-50 px-3.5 py-2.5 text-body font-medium text-grey-900"
          >
            {flow.displayEmail}
          </p>
          <p className="text-body-sm text-grey-600">
            To use a different address, go back to login and change it there.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" loading={submitting || redirecting}>
            Send code
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href={loginHref(flow.loginIdentifier)}>Back to login</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Bound mobile recovery started from /login: retains phone read-only and asks for the registered email. */
function BoundPhoneForgotForm({
  flowId,
  flow,
}: {
  flowId: string;
  flow: Extract<RecoveryFlow, { kind: "bound-phone" }>;
}) {
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
    defaultValues: { email: flow.confirmationEmail ?? "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setNotice(null);
    const confirmationEmail = email.trim();
    try {
      await authApi.forgotPassword({
        identifier: flow.identifier,
        confirmationEmail,
      });
      markCodeSent(cooldownKeys.reset(flow.identifier, confirmationEmail));
      updateRecoveryFlow(flowId, {
        ...flow,
        confirmationEmail,
        displayEmail: confirmationEmail,
        codeSent: true,
      });
      startRedirecting();
      router.push(resetPasswordFlowHref(flowId));
    } catch (error) {
      if (isApiError(error) && error.code === "VALIDATION_FAILED") {
        const emailError = error.fieldErrors.confirmationEmail;
        if (emailError) {
          setError("email", { type: "server", message: emailError }, { shouldFocus: true });
          return;
        }
      }
      setNotice(formatSendError(error));
    }
  });

  return (
    <div className="flex flex-col">
      <Heading description="Enter the email address registered to this mobile number. If the details match an account, we'll send a 6-digit code to its registered email." />

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {notice ? (
          <InlineNotice tone="error" title="We couldn't send a code">
            {notice}
          </InlineNotice>
        ) : null}

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-grey-900">Mobile number</span>
            <p
              data-testid="bound-phone"
              className="rounded-md border border-grey-200 bg-grey-50 px-3.5 py-2.5 text-body font-medium text-grey-900 tabular-nums"
            >
              {formatPhone(flow.identifier)}
            </p>
          </div>

          <FormField id="email" label="Registered email address" error={errors.email?.message}>
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
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting || redirecting}>
            Send code
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href={loginHref(flow.loginIdentifier)}>Back to login</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
