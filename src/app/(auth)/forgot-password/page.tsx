import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/identity";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
