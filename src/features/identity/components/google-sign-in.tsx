"use client";

import Image from "next/image";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { authApi } from "../api";
import { useLeavingPage } from "../hooks/use-leaving-page";
import {
  GOOGLE_LOGIN_ENABLED,
  saveGoogleAccountType,
  type GoogleAccountType,
} from "../lib/google-sign-in";

/**
 * "or" divider + "Continue with Google" (DESIGN.md §6). Renders nothing unless
 * NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED is "true".
 *
 * The click remembers the account type for /register/complete and leaves the app for the backend,
 * which redirects to Google (API.md "Google sign-in").
 */
export function GoogleSignIn({
  accountType,
  helper,
}: {
  /** The register tab, so a new Google user lands on the same form. Login uses "customer". */
  accountType: GoogleAccountType;
  helper?: string;
}) {
  // Back from Google can restore this page as it was left (back/forward cache); the hook clears the spinner.
  const [leaving, startLeaving] = useLeavingPage();

  if (!GOOGLE_LOGIN_ENABLED) return null;

  const helperId = helper ? "google-sign-in-helper" : undefined;

  function continueWithGoogle() {
    startLeaving();
    saveGoogleAccountType(accountType);
    window.location.assign(authApi.googleSignInUrl());
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 text-caption font-normal text-grey-600" aria-hidden="true">
        <span className="h-px flex-1 bg-grey-200" />
        or
        <span className="h-px flex-1 bg-grey-200" />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          loading={leaving}
          onClick={continueWithGoogle}
          aria-describedby={helperId}
        >
          {/* Google's official multicolour "G"; the spinner takes its place while leaving. */}
          {leaving ? null : <Image src="/icons/google.svg" alt="" width={20} height={20} unoptimized />}
          Continue with Google
        </Button>
        {helper ? (
          <p id={helperId} className="text-caption font-normal text-grey-600">
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}
