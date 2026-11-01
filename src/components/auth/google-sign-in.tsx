"use client";

import Image from "next/image";
import * as React from "react";
import { Notice } from "@/components/feedback/notice";
import { Button } from "@/components/ui/button";

/** Baked in at build time (see Dockerfile build args). */
export const GOOGLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true";

/**
 * "or" divider + "Continue with Google" (DESIGN.md §6). Renders nothing unless the flag is on.
 * API.md has no Google endpoint yet, so the button only explains that.
 */
export function GoogleSignIn({ helper }: { helper?: string }) {
  const [clicked, setClicked] = React.useState(false);

  if (!GOOGLE_LOGIN_ENABLED) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 text-caption font-normal text-grey-600" aria-hidden="true">
        <span className="h-px flex-1 bg-grey-200" />
        or
        <span className="h-px flex-1 bg-grey-200" />
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => setClicked(true)}>
          <Image src="/icons/google.svg" alt="" width={20} height={20} unoptimized />
          Continue with Google
        </Button>
        {helper ? <p className="text-caption font-normal text-grey-600">{helper}</p> : null}
      </div>
      {clicked ? (
        <Notice title="Google login isn't available yet">
          Use your mobile number or email for now.
        </Notice>
      ) : null}
    </div>
  );
}
