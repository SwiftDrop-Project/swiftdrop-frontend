import { AuthSplitLayout } from "@/components/layout/auth-split-layout";

/** Public pages anyone can open without logging in. Same split layout as the auth pages for now. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <AuthSplitLayout>{children}</AuthSplitLayout>;
}
