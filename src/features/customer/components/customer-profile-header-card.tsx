import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMonthYear, initials } from "@/lib/format";
import type { CustomerProfile } from "../types";

export function CustomerProfileHeaderCard({ profile }: { profile: CustomerProfile }) {
  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full border border-grey-200 bg-orange-100 text-h2 font-semibold text-grey-800"
          >
            {initials(profile.fullName)}
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-h2 font-semibold text-grey-900">{profile.fullName}</h2>
            <p className="text-body-sm text-grey-600">{profile.email}</p>
            <p className="text-body-sm text-grey-500">
              Customer since {formatMonthYear(profile.customerSince)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 self-start border-t border-grey-100 pt-4 sm:self-center sm:border-t-0 sm:pt-0">
          <div className="flex flex-col">
            <span className="text-display font-semibold text-grey-900 tabular-nums">
              {profile.deliveryCount}
            </span>
            <span className="text-body-sm text-grey-600">Deliveries</span>
          </div>
          <div className="flex flex-col">
            <span className="text-display font-semibold text-grey-900 tabular-nums">
              {profile.savedAddressCount}
            </span>
            <span className="text-body-sm text-grey-600">Saved addresses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
