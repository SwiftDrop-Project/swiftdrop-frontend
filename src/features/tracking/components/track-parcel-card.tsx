"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function TrackParcelCard() {
  const router = useRouter();
  const [error, setError] = React.useState<string | undefined>();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = String(new FormData(event.currentTarget).get("trackingNumber") ?? "").trim();
    if (!number) {
      setError("Enter a tracking number, like SD 2611 0048 17.");
      return;
    }
    setError(undefined);
    router.push(`/customer/track?number=${encodeURIComponent(number)}`);
  }

  return (
    <Card className="p-6" aria-labelledby="track-heading">
      <h2 id="track-heading" className="text-h3 text-grey-900">
        Track a parcel
      </h2>
      <form onSubmit={onSubmit} noValidate className="mt-4">
        <FormField
          id="trackingNumber"
          label="Tracking number"
          helper="Find it in the SMS or on the parcel label."
          error={error}
        >
          {(a11y) => (
            <div className="flex gap-2">
              <Input
                {...a11y}
                name="trackingNumber"
                placeholder="SD 2611 0048 17"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="h-10 tabular-nums"
              />
              <Button type="submit" variant="secondary">
                Track
              </Button>
            </div>
          )}
        </FormField>
      </form>
    </Card>
  );
}
