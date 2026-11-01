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
import { getSafeNext } from "@/lib/roles";
import { loginSchema, type LoginValues } from "@/lib/validation";

interface FormNotice {
  tone: "info" | "error";
  title: string;
  body: string;
}

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

function noticeFor(code: string, message: string): FormNotice {
  switch (code) {
    case "ACCOUNT_PENDING_APPROVAL":
      return { tone: "info", title: "Your account is waiting for approval", body: message };
    case "ACCOUNT_REJECTED":
      return { tone: "error", title: "Your merchant application wasn't approved", body: message };
    case "ACCOUNT_DISABLED":
      return { tone: "error", title: "This account is disabled", body: message };
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

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
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
        {notice ? (
          <Notice tone={notice.tone} title={notice.title}>
            {notice.body}
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

        <GoogleSignIn />

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
