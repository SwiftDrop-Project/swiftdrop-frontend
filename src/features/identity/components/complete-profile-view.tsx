"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import * as React from "react";
import { FormProvider, useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { scrollAuthPageToTop } from "@/components/layout/auth-split-layout";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api";
import { ROLE_HOME } from "@/lib/roles";
import { authApi } from "../api";
import { useRegisterErrorHandler } from "../hooks/use-register-error-handler";
import { clearGoogleAccountType, readGoogleAccountType } from "../lib/google-sign-in";
import {
  customerCompleteProfileSchema,
  merchantCompleteProfileSchema,
  type CustomerCompleteProfileValues,
  type MerchantCompleteProfileInput,
  type MerchantCompleteProfileValues,
} from "../schemas";
import type { User } from "../types";
import { AccountTypeSwitch, type AccountType } from "./account-type-switch";
import {
  ApplicationReceived,
  type MerchantApplicationReceived,
} from "./application-received";
import { MerchantDetailsFields, PhoneField } from "./signup-fields";
import { TermsCheckbox } from "./terms-checkbox";

const TITLE = "Finish setting up your account";

type ViewState =
  | { status: "loading" }
  | { status: "ready"; user: User; initialType: AccountType }
  | { status: "error"; message: string };

/**
 * /register/complete: after "Continue with Google" created a new account (status PROFILE_INCOMPLETE),
 * the user adds what Google doesn't know. Anyone whose profile is already complete is sent home.
 */
export function CompleteProfileView() {
  const router = useRouter();
  const [state, setState] = React.useState<ViewState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const [received, setReceived] = React.useState<MerchantApplicationReceived | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((user) => {
        if (user.status !== "PROFILE_INCOMPLETE") {
          clearGoogleAccountType();
          router.replace(ROLE_HOME[user.role]);
          return;
        }
        // The tab picked before going to Google (login and the customer tab save "customer").
        const initialType = readGoogleAccountType() === "merchant" ? "MERCHANT" : "CUSTOMER";
        setState({ status: "ready", user, initialType });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiError(error) && error.status === 401) {
          router.replace("/login");
          return;
        }
        setState({
          status: "error",
          message: isApiError(error) ? error.message : "Something went wrong. Try again in a moment.",
        });
      });
    return () => controller.abort();
  }, [attempt, router]);

  if (received) {
    return <ApplicationReceived application={received} />;
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">{TITLE}</h1>

      {state.status === "loading" ? (
        <div className="mt-2 flex flex-col gap-8" role="status" aria-label="Loading your account">
          <Skeleton className="h-6 w-full max-w-80" />
          <Skeleton className="h-20 w-full" />
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

      {state.status === "ready" ? (
        <CompleteProfileForms
          user={state.user}
          initialType={state.initialType}
          onMerchantApplied={(application) => {
            clearGoogleAccountType();
            setReceived(application);
            scrollAuthPageToTop();
          }}
        />
      ) : null}
    </div>
  );
}

function CompleteProfileForms({
  user,
  initialType,
  onMerchantApplied,
}: {
  user: User;
  initialType: AccountType;
  onMerchantApplied: (application: MerchantApplicationReceived) => void;
}) {
  const [accountType, setAccountType] = React.useState<AccountType>(initialType);

  return (
    <>
      <p className="mt-2 text-body text-grey-600">
        Signed in with Google as <span className="font-semibold text-grey-900">{user.fullName}</span>{" "}
        <span className="[overflow-wrap:anywhere]">({user.email})</span>. Add a few details to start using SwiftDrop.
      </p>

      <div className="mt-8">
        <AccountTypeSwitch value={accountType} onChange={setAccountType} />
      </div>

      <div className="mt-6">
        {accountType === "CUSTOMER" ? (
          <CustomerCompleteForm />
        ) : (
          <MerchantCompleteForm user={user} onSuccess={onMerchantApplied} />
        )}
      </div>

      <UseAnotherAccount />
    </>
  );
}

/** Logs out, so someone who picked the wrong Google account can start again. */
function UseAnotherAccount() {
  const router = useRouter();
  const [leaving, setLeaving] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  async function logOut() {
    setLeaving(true);
    setFailed(false);
    try {
      await authApi.logout();
      clearGoogleAccountType();
      router.replace("/login");
    } catch {
      setFailed(true);
      setLeaving(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <p className="text-body text-grey-600">
        Wrong Google account?{" "}
        <Button type="button" variant="link" className="text-body font-semibold" disabled={leaving} onClick={logOut}>
          Use another account
        </Button>
      </p>
      {failed ? (
        <p role="alert" className="text-body-sm text-error">
          We couldn&apos;t log you out. Try again in a moment.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The register error handling, plus two cases that only happen here: the profile was already
 * completed (e.g. in another tab) → let the proxy pick the right page; the login expired → log in again.
 */
function useCompleteProfileErrors<T extends FieldValues>(setError: UseFormSetError<T>, fields: readonly Path<T>[]) {
  const router = useRouter();
  const { notice, clearNotice, handleError } = useRegisterErrorHandler(
    setError,
    fields,
    "We couldn't finish setting up your account",
  );

  const handle = React.useCallback(
    (error: unknown) => {
      if (isApiError(error) && error.code === "PROFILE_ALREADY_COMPLETE") {
        router.replace("/");
        return;
      }
      if (isApiError(error) && error.status === 401) {
        router.replace("/login");
        return;
      }
      handleError(error);
    },
    [router, handleError],
  );

  return { notice, clearNotice, handleError: handle };
}

const CUSTOMER_FIELDS = ["phone", "acceptTerms"] as const;

function CustomerCompleteForm() {
  const router = useRouter();
  const [redirecting, setRedirecting] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCompleteProfileValues>({
    resolver: zodResolver(customerCompleteProfileSchema),
    defaultValues: { phone: "", acceptTerms: false },
  });

  const { notice, clearNotice, handleError } = useCompleteProfileErrors(setError, CUSTOMER_FIELDS);

  const onSubmit = handleSubmit(async (values) => {
    clearNotice();
    try {
      // The API replaces the cookie with one for an ACTIVE account.
      await authApi.completeProfile({ accountType: "CUSTOMER", ...values });
      clearGoogleAccountType();
      setRedirecting(true);
      router.replace(ROLE_HOME.CUSTOMER);
    } catch (error) {
      handleError(error);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {notice}

      <PhoneField registration={register("phone")} error={errors.phone?.message} />

      <TermsCheckbox control={control} name="acceptTerms" />

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting || redirecting}>
        Create account
      </Button>
    </form>
  );
}

const MERCHANT_FIELDS = [
  "businessName",
  "businessRegNo",
  "parcelsPerMonth",
  "contactPerson",
  "phone",
  "pickupDistrict",
  "city",
  "acceptTerms",
] as const;

function MerchantCompleteForm({
  user,
  onSuccess,
}: {
  user: User;
  onSuccess: (application: MerchantApplicationReceived) => void;
}) {
  const form = useForm<MerchantCompleteProfileInput, unknown, MerchantCompleteProfileValues>({
    resolver: zodResolver(merchantCompleteProfileSchema),
    defaultValues: {
      businessName: "",
      businessRegNo: "",
      parcelsPerMonth: "",
      contactPerson: user.fullName,
      phone: "",
      pickupDistrict: "",
      city: "",
      acceptTerms: false,
    },
  });
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = form;

  const { notice, clearNotice, handleError } = useCompleteProfileErrors(setError, MERCHANT_FIELDS);

  const onSubmit = handleSubmit(async (values) => {
    clearNotice();
    try {
      // The API clears the cookie: the merchant can log in once an admin approves them.
      const applied = await authApi.completeProfile({ accountType: "MERCHANT", ...values });
      onSuccess({ businessName: applied.merchant?.businessName ?? values.businessName, email: applied.email });
    } catch (error) {
      handleError(error);
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {notice}

        <div className="flex flex-col gap-5">
          <MerchantDetailsFields />
        </div>

        <TermsCheckbox control={control} name="acceptTerms" />

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create merchant account
        </Button>
      </form>
    </FormProvider>
  );
}
