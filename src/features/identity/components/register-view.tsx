"use client";

import * as React from "react";
import { scrollAuthPageToTop } from "@/components/layout/auth-split-layout";
import { TextLink } from "@/components/ui/text-link";
import { AccountTypeSwitch, type AccountType } from "./account-type-switch";
import {
  ApplicationReceived,
  type MerchantApplicationReceived,
} from "./application-received";
import { CustomerRegisterForm } from "./customer-register-form";
import { MerchantRegisterForm } from "./merchant-register-form";

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

      <div className="mt-8">
        <AccountTypeSwitch value={accountType} onChange={setAccountType} />
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
