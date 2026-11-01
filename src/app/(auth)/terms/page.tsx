import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthComingSoon } from "@/components/layout/auth-split-layout";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <AuthComingSoon
      title="Terms of Service"
      description="Our full Terms of Service will be published here, including what you can send and how cash on delivery works."
    >
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/login">Back to log in</Link>
      </Button>
    </AuthComingSoon>
  );
}
