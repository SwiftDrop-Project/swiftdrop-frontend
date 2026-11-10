"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, retryMessage } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import {
  CHANGE_PASSWORD_PATH,
  onboardingFromUser,
  resolvePostAuthDestination,
} from "@/lib/roles";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import { changePasswordSchema, type ChangePasswordValues } from "../schemas";
import type { User } from "../types";

const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

type ViewState =
  | { status: "loading" }
  | { status: "ready"; user: User }
  | { status: "error"; message: string };

/**
 * /change-password: mandatory password change for admin-provisioned or admin-reset staff accounts.
 * Uses the exact same onboarding routing policy as proxy.ts and CurrentUserProvider.
 */
export function MandatoryPasswordChangeView() {
  const router = useRouter();
  const [state, setState] = React.useState<ViewState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    authApi
      .me(controller.signal)
      .then((user) => {
        const destination = resolvePostAuthDestination(onboardingFromUser(user));
        if (destination !== CHANGE_PASSWORD_PATH) {
          router.replace(destination);
          return;
        }
        setState({ status: "ready", user });
      })
      .catch(async (error: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiError(error) && error.status === 401) {
          await authApi.logout().catch(() => undefined);
          router.replace("/login");
          return;
        }
        setState({
          status: "error",
          message: isApiError(error) ? error.message : UNKNOWN_ERROR,
        });
      });

    return () => controller.abort();
  }, [attempt, router]);

  return (
    <div className="flex flex-col">
      <div className="flex size-12 items-center justify-center rounded-lg border border-grey-200 bg-grey-50 text-grey-700">
        <KeyRound className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-display text-grey-900">Change your password</h1>

      {state.status === "loading" ? (
        <div className="mt-3 flex flex-col gap-6" role="status" aria-label="Loading your account">
          <Skeleton className="h-6 w-full max-w-80" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="mt-8 flex flex-col items-start gap-4">
          <InlineNotice tone="error" title="We couldn't load your account" className="w-full">
            {state.message}
          </InlineNotice>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {state.status === "ready" ? <MandatoryPasswordForm user={state.user} /> : null}
    </div>
  );
}

function MandatoryPasswordForm({ user }: { user: User }) {
  const router = useRouter();
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [leaving, startLeaving] = useLeavingPage();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      const updated = await authApi.me();
      startLeaving();
      router.replace(resolvePostAuthDestination(onboardingFromUser(updated)));
    } catch (error) {
      if (!isApiError(error)) {
        setNotice(UNKNOWN_ERROR);
        return;
      }
      if (error.status === 401) {
        await authApi.logout().catch(() => undefined);
        router.replace("/login");
        return;
      }
      if (error.code === "VALIDATION_FAILED") {
        const { handled, unmatched } = applyServerFieldErrors(error, setError, [
          "currentPassword",
          "newPassword",
        ]);
        if (handled && unmatched.length === 0) return;
        setNotice(unmatched[0] ?? error.message);
        return;
      }
      setNotice(error.code === "TOO_MANY_REQUESTS" ? `Too many attempts. ${retryMessage(error)}` : error.message);
    }
  });

  async function onLogout() {
    setLoggingOut(true);
    setNotice(null);
    try {
      await authApi.logout();
      startLeaving();
      router.replace("/login");
    } catch (error) {
      setNotice(isApiError(error) ? error.message : "We couldn't log you out. Try again in a moment.");
    } finally {
      setLoggingOut(false);
    }
  }

  const busy = isSubmitting || loggingOut || leaving;

  return (
    <>
      <p className="mt-2 text-body text-grey-600">
        Signed in as <span className="font-semibold text-grey-900">{user.fullName}</span>{" "}
        <span className="[overflow-wrap:anywhere]">({user.email})</span>. Choose a new password to continue to
        SwiftDrop.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {notice ? (
          <InlineNotice tone="error" title="We couldn't update your password">
            {notice}
          </InlineNotice>
        ) : null}

        <div className="flex flex-col gap-5">
          <FormField
            id="currentPassword"
            label="Current or temporary password"
            error={errors.currentPassword?.message}
          >
            {(a11y) => (
              <PasswordInput
                {...a11y}
                {...register("currentPassword")}
                autoComplete="current-password"
                disabled={busy}
              />
            )}
          </FormField>

          <FormField
            id="newPassword"
            label="New password"
            helper="At least 8 characters, including a number. Must differ from your current password."
            error={errors.newPassword?.message}
          >
            {(a11y) => (
              <PasswordInput
                {...a11y}
                {...register("newPassword")}
                autoComplete="new-password"
                disabled={busy}
              />
            )}
          </FormField>

          <FormField
            id="confirmPassword"
            label="Confirm new password"
            error={errors.confirmPassword?.message}
          >
            {(a11y) => (
              <PasswordInput
                {...a11y}
                {...register("confirmPassword")}
                autoComplete="new-password"
                disabled={busy}
              />
            )}
          </FormField>
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting || leaving} disabled={loggingOut}>
            Save password and continue
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            loading={loggingOut}
            disabled={isSubmitting || leaving}
            onClick={() => void onLogout()}
          >
            Log out
          </Button>
        </div>
      </form>
    </>
  );
}

