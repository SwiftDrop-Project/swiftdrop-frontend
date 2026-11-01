"use client";

import Link from "next/link";
import { MailCheck, Store, User } from "lucide-react";
import * as React from "react";
import { CustomerRegisterForm } from "@/components/auth/customer-register-form";
import {
  MerchantRegisterForm,
  type MerchantApplicationReceived,
} from "@/components/auth/merchant-register-form";
import { SegmentedControl } from "@/components/forms/segmented-control";
import { scrollAuthPageToTop } from "@/components/layout/auth-split-layout";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";

type AccountType = "CUSTOMER" | "MERCHANT";

const ACCOUNT_TYPE_HELP: Record<AccountType, string> = {
  CUSTOMER: "For sending a parcel now and then, and following parcels on their way to you.",
  MERCHANT: "For businesses sending orders regularly, with cash on delivery and bulk upload.",
};

export function RegisterView() {
  const [accountType, setAccountType] = React.useState<AccountType>("CUSTOMER");
  const [received, setReceived] = React.useState<MerchantApplicationReceived | null>(null);

  if (received) {
    return <ApplicationReceived application={received} />;
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">Create your account</h1>
      <p className="mt-2 text-body text-grey-600">
        Book pickups and track deliveries to any district in Sri Lanka.
      </p>

      <div className="mt-8 flex flex-col gap-1">
        <SegmentedControl
          name="accountType"
          legend="Account type"
          value={accountType}
          onChange={setAccountType}
          describedBy="accountType-help"
          options={[
            { value: "CUSTOMER", label: "Customer", icon: User },
            { value: "MERCHANT", label: "Merchant", icon: Store },
          ]}
        />
        <p id="accountType-help" className="text-body-sm text-grey-600">
          {ACCOUNT_TYPE_HELP[accountType]}
        </p>
      </div>

      <div className="mt-6">
        {accountType === "CUSTOMER" ? (
          <CustomerRegisterForm />
        ) : (
          <MerchantRegisterForm
            onSuccess={(application) => {
              setReceived(application);
              scrollAuthPageToTop();
            }}
          />
        )}
      </div>

      <p className="mt-6 text-body text-grey-600">
        Already have an account? <TextLink href="/login">Log in</TextLink>
      </p>
    </div>
  );
}

function ApplicationReceived({ application }: { application: MerchantApplicationReceived }) {
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
