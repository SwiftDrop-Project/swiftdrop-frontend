import { redirect } from "next/navigation";

// Logged-in users are sent to their home by src/proxy.ts before reaching this page.
export default function RootPage() {
  redirect("/login");
}
