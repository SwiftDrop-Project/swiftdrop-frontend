import type { Metadata } from "next";
import { DispatchQueue } from "@/features/dispatch";

export const metadata: Metadata = { title: "Unassigned parcels" };

export default function Page() {
  return <DispatchQueue />;
}
