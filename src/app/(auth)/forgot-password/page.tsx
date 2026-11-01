import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthComingSoon } from "@/components/layout/auth-split-layout";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthComingSoon
      title="Reset your password"
      description="Resetting your password online is coming soon. Until then, contact our support team and we'll help you get back into your account."
    >
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/login">Back to log in</Link>
      </Button>
    </AuthComingSoon>
  );
}
