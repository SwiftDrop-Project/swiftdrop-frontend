import type { Metadata } from "next";
import Link from "next/link";
import { AuthComingSoon } from "@/components/layout/auth-split-layout";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Track a parcel" };

export default function TrackPage() {
  return (
    <AuthComingSoon
      title="Track a parcel"
      description="Tracking a parcel without an account is coming soon. If you have an account, log in to follow your parcels."
    >
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/login">Log in</Link>
      </Button>
    </AuthComingSoon>
  );
}
