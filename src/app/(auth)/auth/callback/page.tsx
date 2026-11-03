import type { Metadata } from "next";
import { GoogleCallback } from "@/features/identity";

export const metadata: Metadata = { title: "Signing you in" };

/** The backend redirects here after "Continue with Google" (API.md "Google sign-in"). */
export default function GoogleCallbackPage() {
  return <GoogleCallback />;
}
