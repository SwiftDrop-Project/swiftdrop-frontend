"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/layout/form-page";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { PasswordInput } from "@/components/ui/password-input";
import { TextLink } from "@/components/ui/text-link";
import { isApiError, retryMessage } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { authApi } from "../api";
import { changePasswordSchema, type ChangePasswordValues } from "../schemas";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

interface Notice {
  tone: "success" | "error";
  title: string;
  body: string;
}

/**
 * "Change password" on every role's Settings page. The API keeps this session (fresh cookie) and logs the
 * account out everywhere else.
 */
export function ChangePasswordForm() {
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      reset();
      setNotice({
        tone: "success",
        title: "Password changed",
        body: "You've been logged out on your other devices.",
      });
    } catch (error) {
      if (!isApiError(error)) {
        setNotice({ tone: "error", title: "We couldn't change your password", body: UNKNOWN_ERROR });
        return;
      }
      if (error.code === "VALIDATION_FAILED") {
        const { handled, unmatched } = applyServerFieldErrors(error, setError, ["currentPassword", "newPassword"]);
        if (handled && unmatched.length === 0) return;
      }
      setNotice({
        tone: "error",
        title: "We couldn't change your password",
        body: error.code === "TOO_MANY_REQUESTS" ? `Too many attempts. ${retryMessage(error)}` : error.message,
      });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {notice ? (
        <InlineNotice tone={notice.tone} title={notice.title}>
          {notice.body}
        </InlineNotice>
      ) : null}

      <FormField
        id="currentPassword"
        label="Current password"
        error={errors.currentPassword?.message}
        labelAside={
          <TextLink href="/forgot-password" className="text-label">
            Forgot password?
          </TextLink>
        }
      >
        {(a11y) => (
          <PasswordInput {...a11y} {...register("currentPassword")} size="md" autoComplete="current-password" />
        )}
      </FormField>

      <FormField
        id="newPassword"
        label="New password"
        helper="At least 8 characters, including a number."
        error={errors.newPassword?.message}
      >
        {(a11y) => <PasswordInput {...a11y} {...register("newPassword")} size="md" autoComplete="new-password" />}
      </FormField>

      <FormField id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
        {(a11y) => (
          <PasswordInput {...a11y} {...register("confirmPassword")} size="md" autoComplete="new-password" />
        )}
      </FormField>

      <FormActions>
        <Button type="submit" loading={isSubmitting}>
          Change password
        </Button>
      </FormActions>
    </form>
  );
}
