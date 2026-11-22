import Link from "next/link";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

export function PasswordSecurityCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-h3 font-semibold text-grey-900">Password and security</h3>
        <p className="mt-2 text-body-sm text-grey-600">
          Change your password or sign-in details in Settings.
        </p>
        <div className="mt-3">
          <Link
            href="/customer/settings"
            className="text-body-sm font-medium text-orange-700 hover:text-orange-800 hover:underline"
          >
            Open Settings
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
