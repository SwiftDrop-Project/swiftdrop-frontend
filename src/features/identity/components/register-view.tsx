"use client";

import * as React from "react";
import { TextLink } from "@/components/ui/text-link";
import { AccountTypeSwitch, type AccountType } from "./account-type-switch";
import { CustomerRegisterForm } from "./customer-register-form";
import { MerchantRegisterForm } from "./merchant-register-form";

/** /register. Both account types continue on /verify-email after sign-up. */
export function RegisterView() {
  const [accountType, setAccountType] = React.useState<AccountType>("CUSTOMER");

  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">Create your account</h1>
      <p className="mt-2 text-body text-grey-600">
        Book pickups and track deliveries to any district in Sri Lanka.
      </p>

      <div className="mt-8">
        <AccountTypeSwitch value={accountType} onChange={setAccountType} />
      </div>

      <div className="mt-6">{accountType === "CUSTOMER" ? <CustomerRegisterForm /> : <MerchantRegisterForm />}</div>

      <p className="mt-6 text-body text-grey-600">
        Already have an account? <TextLink href="/login">Log in</TextLink>
      </p>
    </div>
  );
}
