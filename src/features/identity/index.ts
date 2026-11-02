/*
 * Public API of the identity feature (backend module: identity).
 * Other features and app/ import only from "@/features/identity", never from files inside it.
 */

// Pages
export { LoginForm } from "./components/login-form";
export { RegisterView } from "./components/register-view";
export { CompleteProfileView } from "./components/complete-profile-view";
export { GoogleCallback } from "./components/google-callback";

// The logged-in user, for the app shell and any page inside it
export { CurrentUserProvider, useCurrentUser, useCurrentUserState } from "./components/current-user";

export { authApi } from "./api";
export type * from "./types";
