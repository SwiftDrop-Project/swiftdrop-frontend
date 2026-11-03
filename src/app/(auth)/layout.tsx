import { AuthSplitLayout } from "@/components/layout/auth-split-layout";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthSplitLayout>{children}</AuthSplitLayout>;
}
