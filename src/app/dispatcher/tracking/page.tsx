import type { Metadata } from "next";
import { LiveBoard } from "@/features/tracking";

export const metadata: Metadata = { title: "Live tracking" };

export default function Page() {
  return <LiveBoard />;
}
