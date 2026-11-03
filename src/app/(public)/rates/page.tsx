import type { Metadata } from "next";
import Link from "next/link";
import { AuthComingSoon } from "@/components/layout/auth-split-layout";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Delivery rates" };

/** Public delivery rates by district (pricing feature). Placeholder until the pricing API exists. */
export default function RatesPage() {
  return (
    <AuthComingSoon
      title="Delivery rates"
      description="Delivery rates by district and parcel weight are coming soon. Log in to see the price of a delivery before you book it."
    >
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/login">Log in</Link>
      </Button>
    </AuthComingSoon>
  );
}
