"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

export interface MerchantApplicationReceived {
  businessName: string;
  email: string;
}

/** Shown after a merchant applies, from /register or /register/complete. */
export function ApplicationReceived({ application }: { application: MerchantApplicationReceived }) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  // Move focus to the new heading so screen readers announce the result.
  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex size-12 items-center justify-center rounded-lg border border-grey-200 bg-grey-50 text-grey-700">
        <MailCheck className="size-6" aria-hidden="true" />
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-display text-grey-900 outline-none">
        Application received
      </h1>
      <p className="mt-2 text-body text-grey-600">
        Thanks for applying, {application.businessName}. Our team checks every new merchant account
        before it can send orders.
      </p>
      <p className="mt-4 text-body text-grey-600">
        We&apos;ll email <span className="font-semibold text-grey-900">{application.email}</span> when
        your account is approved. You can log in after that.
      </p>
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/login">Back to log in</Link>
      </Button>
    </div>
  );
}
