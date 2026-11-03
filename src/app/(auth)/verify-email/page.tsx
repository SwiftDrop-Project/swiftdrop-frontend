import type { Metadata } from "next";
import { VerifyEmailView } from "@/features/identity";

export const metadata: Metadata = { title: "Check your email" };

export default function VerifyEmailPage() {
  return <VerifyEmailView />;
}
