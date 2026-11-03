import type { Metadata } from "next";
import { LoginForm } from "@/features/identity";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return <LoginForm />;
}
