import { FormSection } from "@/components/layout/form-page";
import { ChangePasswordForm } from "./change-password-form";

/** The Settings page body for every role. Profile details come later; for now: the password. */
export function AccountSettings() {
  return (
    <FormSection
      title="Change password"
      description="Changing your password logs you out on your other devices. Accounts created with Google can set a first password with Forgot password."
    >
      <ChangePasswordForm />
    </FormSection>
  );
}
