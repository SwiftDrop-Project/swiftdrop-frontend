import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthComingSoon } from "@/components/layout/auth-split-layout";

export const metadata: Metadata = { title: "Help centre" };

export default function HelpPage() {
  return (
    <AuthComingSoon
      title="Help centre"
      description="Guides on booking pickups, delivery rates by district and cash on delivery are coming soon."
    >
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/login">Back to log in</Link>
      </Button>
    </AuthComingSoon>
  );
}
