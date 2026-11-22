/*
 * Public API of the identity feature (backend module: identity).
 * Other features and app/ import only from "@/features/identity", never from files inside it.
 */

// Pages
export { LoginForm } from "./components/login-form";
export { RegisterView } from "./components/register-view";
export { CompleteProfileView } from "./components/complete-profile-view";
export { GoogleCallback } from "./components/google-callback";
export { VerifyEmailView } from "./components/verify-email-view";
export { ForgotPasswordForm } from "./components/forgot-password-form";
export { ResetPasswordForm } from "./components/reset-password-form";
export { MandatoryPasswordChangeView } from "./components/mandatory-password-change-view";
export { AccountSettings } from "./components/account-settings";

// Admin dashboard & staff management
export { AdminOverview } from "./components/admin-overview";
export { CourierManagement } from "./components/courier-management";
export { CourierDetailView } from "./components/courier-detail-view";
export { DispatcherManagement } from "./components/dispatcher-management";
export { DispatcherDetailView } from "./components/dispatcher-detail-view";
export { UserManagement } from "./components/user-management";
export { UserDetailView } from "./components/user-detail-view";

// The logged-in user, for the app shell and any page inside it
export { CurrentUserProvider, useCurrentUser, useCurrentUserState } from "./components/current-user";
export { RequireCurrentUser } from "./components/require-current-user";

export { authApi, staffApi, userAdminApi } from "./api";
export type * from "./types";
