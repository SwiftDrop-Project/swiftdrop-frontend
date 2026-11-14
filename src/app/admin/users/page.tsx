import type { Metadata } from "next";
import { UserManagement } from "@/features/identity";

export const metadata: Metadata = { title: "User Management" };

export default function AdminUsersPage() {
  return <UserManagement />;
}
