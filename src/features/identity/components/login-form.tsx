"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Package } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { TextButton, TextLink } from "@/components/ui/text-link";
import { isApiError, retryMessage } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { onboardingFromUser, resolvePostAuthDestination } from "@/lib/roles";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { cooldownKeys, markCodeSent, startCooldown, useCooldown } from "../lib/cooldown";
import { GOOGLE_SIGN_IN_ERRORS, isGoogleSignInError } from "../lib/google-sign-in";
import { verifyEmailHref } from "../lib/routes";
import { loginSchema, type LoginValues } from "../schemas";
import type { GoogleSignInError } from "../types";
import { GoogleSignIn } from "./google-sign-in";

interface FormNotice {
  tone: "info" | "success" | "error";
  title: string;
  body: string;
  /** Special notices with an action or a live countdown. */
  kind?: "emailNotVerified" | "rateLimited";
}

const PASSWORD_UPDATED: FormNotice = {
  tone: "success",
  title: "Password updated",
  body: "Log in with your new password.",
};

const LOGIN_COOLDOWN = cooldownKeys.rateLimit("login");

/** /login?notice=password_updated, after a password reset. */
function readPasswordUpdated(): boolean {
  return new URLSearchParams(window.location.search).get("notice") === "password_updated";
}

/** The URL only changes by navigation, which remounts the form, so there is nothing to subscribe to. */
function subscribeToNothing() {
  return () => {};
}

/** A known ?error= code from a Google sign-in redirect; unknown values are ignored. */
function readUrlError(): GoogleSignInError | null {
  const error = new URLSearchParams(window.location.search).get("error");
  return isGoogleSignInError(error) ? error : null;
}

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

/** Same notices whether the account problem comes from this form or from a Google sign-in redirect. */
function noticeFor(code: string, message: string): FormNotice {
  switch (code) {
    case "ACCOUNT_PENDING_APPROVAL":
      return { ...GOOGLE_SIGN_IN_ERRORS.account_pending_approval, body: message };
    case "ACCOUNT_REJECTED":
      return { ...GOOGLE_SIGN_IN_ERRORS.account_rejected, body: message };
    case "ACCOUNT_DISABLED":
      return { ...GOOGLE_SIGN_IN_ERRORS.account_disabled, body: message };
    case "ACCOUNT_REMOVED":
      return { tone: "error", title: "Account removed", body: message };
    case "EMAIL_NOT_VERIFIED":
      return {
        tone: "info",
        title: "Confirm your email first",
        body: "Enter the code we emailed you.",
        kind: "emailNotVerified",
      };
    default:
      // INVALID_CREDENTIALS, NETWORK_ERROR and anything unexpected
      return { tone: "error", title: "We couldn't log you in", body: message };
  }
}

export function LoginForm() {
  const router = useRouter();
  const [notice, setNotice] = React.useState<FormNotice | null>(null);
  const [redirecting, startRedirecting] = useLeavingPage();
  const [openingVerify, startOpeningVerify] = useLeavingPage();
  const waitSeconds = useCooldown(LOGIN_COOLDOWN);

  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", rememberMe: true },
  });

  // "Continue with Google" failures come back as /login?error=…. The code is read from the URL on the
  // client (so the form can still be prerendered), kept in state, and then removed from the URL so a
  // reload or a shared link doesn't show it again.
  const urlError = React.useSyncExternalStore(subscribeToNothing, readUrlError, () => null);
  const [googleError, setGoogleError] = React.useState<GoogleSignInError | null>(null);
  if (urlError !== null && urlError !== googleError) {
    setGoogleError(urlError);
  }
  // After a password reset: /login?notice=password_updated, handled the same way.
  const urlPasswordUpdated = React.useSyncExternalStore(subscribeToNothing, readPasswordUpdated, () => false);
  const [passwordUpdated, setPasswordUpdated] = React.useState(false);
  if (urlPasswordUpdated && !passwordUpdated) {
    setPasswordUpdated(true);
  }

  React.useEffect(() => {
    if (urlError === null && !urlPasswordUpdated) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [urlError, urlPasswordUpdated]);

  const shownNotice: FormNotice | null =
    notice ??
    (googleError ? GOOGLE_SIGN_IN_ERRORS[googleError] : null) ??
    (passwordUpdated ? PASSWORD_UPDATED : null);

  /** "Verify email": a fresh code for an email identifier; a mobile number has /verify-email ask for the email. */
  async function openVerifyEmail() {
    const identifier = getValues("identifier").trim();
    if (!identifier.includes("@")) {
      router.push(verifyEmailHref());
      return;
    }
    startOpeningVerify();
    try {
      await authApi.resendVerification(identifier);
      markCodeSent(cooldownKeys.verify(identifier));
    } catch {
      // A code may still be on its way (the 60-second limit); /verify-email can send another one.
    }
    router.push(verifyEmailHref(identifier));
  }

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    setGoogleError(null);
    setPasswordUpdated(false);
    try {
      const user = await authApi.login(values);
      startRedirecting();
      // Read ?next here rather than with useSearchParams, so the form can be prerendered.
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(resolvePostAuthDestination(onboardingFromUser(user), next));
    } catch (error) {
      if (!isApiError(error)) {
        setNotice({ tone: "error", title: "We couldn't log you in", body: UNKNOWN_ERROR });
        return;
      }
      if (error.code === "VALIDATION_FAILED") {
        const { handled, unmatched } = applyServerFieldErrors(error, setError, ["identifier", "password"]);
        if (handled && unmatched.length === 0) return;
        setNotice({ tone: "error", title: "We couldn't log you in", body: unmatched[0] ?? error.message });
        return;
      }
      if (error.code === "TOO_MANY_REQUESTS") {
        startCooldown(LOGIN_COOLDOWN, error.retryAfterSeconds ?? 60);
        setNotice({ tone: "error", title: "Too many attempts", body: retryMessage(error), kind: "rateLimited" });
        return;
      }
      setNotice(noticeFor(error.code, error.message));
    }
  });

  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">Log in</h1>
      <p className="mt-2 text-body text-grey-600">
        Use the mobile number or email linked to your account.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {shownNotice ? (
          <InlineNotice tone={shownNotice.tone} title={shownNotice.title}>
            {shownNotice.kind === "rateLimited" ? (
              waitSeconds > 0 ? (
                `Try again in ${waitSeconds} ${waitSeconds === 1 ? "second" : "seconds"}.`
              ) : (
                "You can try again now."
              )
            ) : (
              shownNotice.body
            )}
            {shownNotice.kind === "emailNotVerified" ? (
              <>
                {" "}
                <TextButton onClick={() => void openVerifyEmail()} disabled={openingVerify}>
                  Verify email
                </TextButton>
              </>
            ) : null}
          </InlineNotice>
        ) : null}

        <div className="flex flex-col gap-5">
          <FormField id="identifier" label="Mobile number or email" error={errors.identifier?.message}>
            {(a11y) => (
              <Input
                {...a11y}
                {...register("identifier")}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="077 123 4567 or name@example.com"
              />
            )}
          </FormField>

          <FormField
            id="password"
            label="Password"
            error={errors.password?.message}
            labelAside={
              <TextLink href="/forgot-password" className="text-label">
                Forgot password?
              </TextLink>
            }
          >
            {(a11y) => (
              <PasswordInput {...a11y} {...register("password")} autoComplete="current-password" />
            )}
          </FormField>
        </div>

        <Controller
          name="rememberMe"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Checkbox
                id="rememberMe"
                ref={field.ref}
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
              />
              <label htmlFor="rememberMe" className="cursor-pointer text-body text-grey-700">
                Keep me logged in on this device
              </label>
            </div>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={waitSeconds > 0}
          loading={isSubmitting || redirecting}
        >
          Log in
        </Button>

        <GoogleSignIn accountType="customer" />

        <p className="text-body text-grey-600">
          New to SwiftDrop? <TextLink href="/register">Create an account</TextLink>
        </p>
      </form>

      <hr className="my-5 border-grey-200" />

      <div className="flex gap-3 text-body text-grey-600">
        <Package className="mt-0.5 size-5 shrink-0 text-grey-700" aria-hidden="true" />
        <p>
          Only need to check on a parcel? <TextLink href="/track">Track a parcel</TextLink> without
          logging in.
        </p>
      </div>
    </div>
  );
}
