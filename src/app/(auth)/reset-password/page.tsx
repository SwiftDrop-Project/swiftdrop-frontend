import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/identity";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
