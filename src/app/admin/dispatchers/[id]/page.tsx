import type { Metadata } from "next";
import { DispatcherDetailView } from "@/features/identity";

export const metadata: Metadata = { title: "Dispatcher Details" };

export default function AdminDispatcherDetailPage() {
  return <DispatcherDetailView />;
}

