import type { Metadata } from "next";
import { MandatoryPasswordChangeView } from "@/features/identity";

export const metadata: Metadata = { title: "Change password" };

export default function ChangePasswordPage() {
  return <MandatoryPasswordChangeView />;
}

