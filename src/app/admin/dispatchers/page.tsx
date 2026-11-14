import type { Metadata } from "next";
import { DispatcherManagement } from "@/features/identity";

export const metadata: Metadata = { title: "Dispatcher Management" };

export default function AdminDispatchersPage() {
  return <DispatcherManagement />;
}

