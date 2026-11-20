import type { Metadata } from "next";
import { ApiKeysManager } from "@/features/merchants";

export const metadata: Metadata = { title: "API keys" };

export default function Page() {
  return <ApiKeysManager />;
}
