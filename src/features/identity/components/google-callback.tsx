"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ROLE_HOME } from "@/lib/roles";
import { authApi } from "../api";
import { clearGoogleAccountType } from "../lib/google-sign-in";

/**
 * /auth/callback: where the backend sends the browser after a successful "Continue with Google"
 * (the SD_TOKEN cookie is already set). Asks who is logged in and moves on.
 */
export function GoogleCallback() {
  const router = useRouter();

  React.useEffect(() => {
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((user) => {
        if (user.status === "PROFILE_INCOMPLETE") {
          router.replace("/register/complete");
          return;
        }
        clearGoogleAccountType();
        router.replace(ROLE_HOME[user.role]);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        router.replace("/login?error=google_failed");
      });
    return () => controller.abort();
  }, [router]);

  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">Signing you in</h1>
      <p role="status" className="mt-2 flex items-center gap-2 text-body text-grey-600">
        <LoaderCircle className="size-5 animate-spin text-grey-700" aria-hidden="true" />
        Getting your account ready…
      </p>
    </div>
  );
}
