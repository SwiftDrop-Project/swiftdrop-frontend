import type { Metadata } from "next";
import { CompleteProfileView } from "@/components/auth/complete-profile-view";

export const metadata: Metadata = { title: "Finish setting up your account" };

export default function CompleteProfilePage() {
  return <CompleteProfileView />;
}
