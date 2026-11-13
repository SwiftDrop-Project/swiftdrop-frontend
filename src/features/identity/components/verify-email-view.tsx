"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { scrollAuthPageToTop } from "@/components/layout/auth-split-layout";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { TextButton, TextLink } from "@/components/ui/text-link";
import { isApiError, retryMessage } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { onboardingFromUser, resolvePostAuthDestination } from "@/lib/roles";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { useHydrated, useQueryParam } from "../hooks/use-query-param";
import { codeErrorNotice } from "../lib/code-errors";
import { cooldownKeys, formatCountdown, markCodeSent, useCooldown } from "../lib/cooldown";
import { maskEmail } from "../lib/email";
import { verifyEmailHref } from "../lib/routes";
import { emailOnlySchema, type EmailOnlyValues } from "../schemas";
import { ApplicationReceived, type MerchantApplicationReceived } from "./application-received";

const CODE_INPUT_ID = "code";
const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

interface Notice {
  tone: "info" | "success" | "error";
  title: string;
  body: string;
}

/**
 * /verify-email?email=…: enter the 6-digit code from the sign-up email.
 * Customers are logged in and go to /customer; merchants see "Application received".
 * Without ?email= (e.g. after logging in with a mobile number) it first asks for the address.
 */
export function VerifyEmailView() {
  const hydrated = useHydrated();
  const urlEmail = useQueryParam("email");
  const [enteredEmail, setEnteredEmail] = React.useState<string | null>(null);
  const [received, setReceived] = React.useState<MerchantApplicationReceived | null>(null);

  if (!hydrated) {
    return <Heading title="Check your email" />;
  }
  if (received) {
    return <ApplicationReceived application={received} />;
  }

  const email = enteredEmail ?? urlEmail;
  if (!email) {
    return <AskForEmail onSent={setEnteredEmail} />;
  }
  return (
    <EnterCode
      key={email}
      email={email}
      onMerchantVerified={(application) => {
        setReceived(application);
        scrollAuthPageToTop();
      }}
    />
  );
}

function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <>
      <div className="flex size-12 items-center justify-center rounded-lg border border-grey-200 bg-grey-50 text-grey-700">
        <MailCheck className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-display text-grey-900">{title}</h1>
      {children ? <p className="mt-2 text-body text-grey-600">{children}</p> : null}
    </>
  );
}

function EnterCode({
  email,
  onMerchantVerified,
}: {
  email: string;
  onMerchantVerified: (application: MerchantApplicationReceived) => void;
}) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [redirecting, startRedirecting] = useLeavingPage();
  const [resending, setResending] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [codeInvalid, setCodeInvalid] = React.useState(false);
  const resendIn = useCooldown(cooldownKeys.verify(email));

  async function verify(value: string) {
    if (submitting || value.length !== 6) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const user = await authApi.verifyEmail({ email, code: value });
      if (user.role === "MERCHANT") {
        onMerchantVerified({ businessName: user.merchant?.businessName ?? "your business", email: user.email });
        return;
      }
      // Customers are logged in now (the API set the cookie).
      startRedirecting();
      router.replace(resolvePostAuthDestination(onboardingFromUser(user)));
    } catch (error) {
      const { title, body } = codeErrorNotice(error);
      setNotice({ tone: "error", title, body });
      setCodeInvalid(true);
      setCode("");
      document.getElementById(CODE_INPUT_ID)?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    setNotice(null);
    try {
      await authApi.resendVerification(email);
      markCodeSent(cooldownKeys.verify(email));
      setNotice({
        tone: "success",
        title: "We sent a new code",
        body: `Check ${maskEmail(email)}. Only the newest code works.`,
      });
      setCodeInvalid(false);
      setCode("");
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
      <Heading title="Check your email">
        We sent a 6-digit code to <span className="font-semibold text-grey-900">{maskEmail(email)}</span>.
        Enter it below to confirm your email address.
      </Heading>

      <form
        noValidate
        className="mt-8 flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void verify(code);
        }}
      >
        {notice ? (
          <InlineNotice tone={notice.tone} title={notice.title}>
            {notice.body}
          </InlineNotice>
        ) : null}

        <FormField
          id={CODE_INPUT_ID}
          label="Verification code"
          helper="The code works for 10 minutes. Check your spam folder if you can't find the email."
        >
          {(a11y) => (
            <CodeInput
              {...a11y}
              aria-invalid={codeInvalid}
              value={code}
              onChange={(value) => {
                setCode(value);
                if (codeInvalid) setCodeInvalid(false);
              }}
              onComplete={(value) => void verify(value)}
              disabled={submitting || redirecting}
              autoFocus
            />
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={code.length !== 6}
          loading={submitting || redirecting}
        >
          Confirm email
        </Button>

        <p className="text-body text-grey-600">
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

        <p className="text-body text-grey-600">
          Wrong address? <TextLink href="/register">Use a different email</TextLink>
        </p>
      </form>
    </div>
  );
}

function AskForEmail({ onSent }: { onSent: (email: string) => void }) {
  const [notice, setNotice] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setNotice(null);
    const address = email.trim();
    try {
      await authApi.resendVerification(address);
      markCodeSent(cooldownKeys.verify(address));
      // Keep the address in the URL, so a reload stays on the code step.
      window.history.replaceState(window.history.state, "", verifyEmailHref(address));
      onSent(address);
    } catch (error) {
      if (isApiError(error) && error.code === "VALIDATION_FAILED") {
        const { handled } = applyServerFieldErrors(error, setError, ["email"]);
        if (handled) return;
      }
      setNotice(
        isApiError(error)
          ? error.code === "TOO_MANY_REQUESTS"
            ? retryMessage(error)
            : error.message
          : UNKNOWN_ERROR,
      );
    }
  });

  return (
    <div className="flex flex-col">
      <Heading title="Confirm your email">
        Enter the email you signed up with and we&apos;ll send you a 6-digit code.
      </Heading>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {notice ? (
          <InlineNotice tone="error" title="We couldn't send a code">
            {notice}
          </InlineNotice>
        ) : null}

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
              autoFocus
            />
          )}
        </FormField>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Send code
        </Button>

        <p className="text-body text-grey-600">
          <TextLink href="/login">Back to log in</TextLink>
        </p>
      </form>
    </div>
  );
}
