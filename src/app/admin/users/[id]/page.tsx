import type { Metadata } from "next";
import { UserDetailView } from "@/features/identity";

export const metadata: Metadata = { title: "Account Details" };

export default function AdminUserDetailPage() {
  return <UserDetailView />;
}
