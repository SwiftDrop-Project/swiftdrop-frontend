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
export { AccountSettings } from "./components/account-settings";

// The logged-in user, for the app shell and any page inside it
export { CurrentUserProvider, useCurrentUser, useCurrentUserState } from "./components/current-user";

export { authApi } from "./api";
export type * from "./types";
