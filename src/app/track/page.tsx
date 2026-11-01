import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthComingSoon, AuthSplitLayout } from "@/components/layout/auth-split-layout";

export const metadata: Metadata = { title: "Track a parcel" };

// Lives outside the (auth) group so track/[trackingNumber] can get its own layout later.
export default function TrackPage() {
  return (
    <AuthSplitLayout>
      <AuthComingSoon
        title="Track a parcel"
        description="Tracking a parcel without an account is coming soon. If you have an account, log in to follow your parcels."
      >
        <Button asChild size="lg" className="mt-10 w-full">
          <Link href="/login">Log in</Link>
        </Button>
      </AuthComingSoon>
    </AuthSplitLayout>
  );
}
