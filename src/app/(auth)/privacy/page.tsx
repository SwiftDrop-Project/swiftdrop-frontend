import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthComingSoon } from "@/components/layout/auth-split-layout";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <AuthComingSoon
      title="Privacy Policy"
      description="Our full Privacy Policy will be published here. It explains what we store about you and your parcels, and why."
    >
      <Button asChild size="lg" className="mt-10 w-full">
        <Link href="/login">Back to log in</Link>
      </Button>
    </AuthComingSoon>
  );
}
