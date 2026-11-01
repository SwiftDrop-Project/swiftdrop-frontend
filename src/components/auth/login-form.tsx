"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Package } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { Notice } from "@/components/feedback/notice";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import { authApi, isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { GOOGLE_SIGN_IN_ERRORS, isGoogleSignInError } from "@/lib/google-sign-in";
import type { GoogleSignInError } from "@/types";
import { getSafeNext } from "@/lib/roles";
import { loginSchema, type LoginValues } from "@/lib/validation";

interface FormNotice {
  tone: "info" | "error";
  title: string;
  body: string;
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
    default:
      // INVALID_CREDENTIALS, NETWORK_ERROR and anything unexpected
      return { tone: "error", title: "We couldn't log you in", body: message };
  }
}

export function LoginForm() {
  const router = useRouter();
  const [notice, setNotice] = React.useState<FormNotice | null>(null);
  const [redirecting, setRedirecting] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
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
  React.useEffect(() => {
    if (urlError === null) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [urlError]);

  const shownNotice = notice ?? (googleError ? GOOGLE_SIGN_IN_ERRORS[googleError] : null);

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    setGoogleError(null);
    try {
      const user = await authApi.login(values);
      setRedirecting(true);
      // Read ?next here rather than with useSearchParams, so the form can be prerendered.
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(getSafeNext(next, user.role));
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
      setNotice(noticeFor(error.code, error.message));
    }
  });

  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">Log in</h1>
      <p className="mt-2 text-body text-grey-600">
        Use the mobile number or email linked to your SwiftDrop account.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {shownNotice ? (
          <Notice tone={shownNotice.tone} title={shownNotice.title}>
            {shownNotice.body}
          </Notice>
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

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting || redirecting}>
          Log in
        </Button>

        <GoogleSignIn accountType="customer" />

        <p className="text-body text-grey-600">
          New to SwiftDrop? <TextLink href="/register">Create an account</TextLink>
        </p>
      </form>

      <hr className="my-8 border-grey-200" />

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
