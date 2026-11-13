import { FormSection } from "@/components/layout/form-page";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangePasswordForm } from "./change-password-form";
import { RequireCurrentUser } from "./require-current-user";

function AccountSettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading account settings" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-11 w-40" />
    </div>
  );
}

/** The Settings page body for every role. Profile details come later; for now: the password. */
export function AccountSettings() {
  return (
    <RequireCurrentUser fallback={<AccountSettingsSkeleton />}>
      <FormSection
        title="Change password"
        description="Changing your password logs you out on your other devices. Accounts created with Google can set a first password with Forgot password."
      >
        <ChangePasswordForm />
      </FormSection>
    </RequireCurrentUser>
  );
}
