"use client";

import { Store, User } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";

export type AccountType = "CUSTOMER" | "MERCHANT";

const ACCOUNT_TYPE_HELP: Record<AccountType, string> = {
  CUSTOMER: "For sending a parcel now and then, and following parcels on their way to you.",
  MERCHANT: "For businesses sending orders regularly, with cash on delivery and bulk upload.",
};

/** Customer / Merchant switch with a one-line explanation, used on /register and /register/complete. */
export function AccountTypeSwitch({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (value: AccountType) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <SegmentedControl
        name="accountType"
        legend="Account type"
        value={value}
        onChange={onChange}
        describedBy="accountType-help"
        options={[
          { value: "CUSTOMER", label: "Customer", icon: User },
          { value: "MERCHANT", label: "Merchant", icon: Store },
        ]}
      />
      <p id="accountType-help" className="text-body-sm text-grey-600">
        {ACCOUNT_TYPE_HELP[value]}
      </p>
    </div>
  );
}
