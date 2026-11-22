/* Links between the identity screens, built in one place. */

/** /login, optionally carrying back a non-sensitive identifier so the user can correct it (never a password). */
export function loginHref(identifier?: string): string {
  const trimmed = identifier?.trim();
  return trimmed ? `/login?${new URLSearchParams({ identifier: trimmed })}` : "/login";
}

/** /verify-email for this address; without an email the page first asks for it. */
export function verifyEmailHref(email?: string): string {
  return email ? `/verify-email?${new URLSearchParams({ email })}` : "/verify-email";
}

/** /forgot-password; with `flowId`, opens a login-bound recovery flow stored for this tab. */
export function forgotPasswordHref(flowId?: string): string {
  return flowId ? `/forgot-password?${new URLSearchParams({ flow: flowId })}` : "/forgot-password";
}

/** Standalone /reset-password for the email the code was sent to. */
export function resetPasswordHref(email: string): string {
  return `/reset-password?email=${encodeURIComponent(email)}`;
}

/** /reset-password bound to an in-tab login recovery flow. */
export function resetPasswordFlowHref(flowId: string): string {
  return `/reset-password?${new URLSearchParams({ flow: flowId })}`;
}

/** After a password reset, /login shows "Password updated. Log in with your new password." */
export const PASSWORD_UPDATED_LOGIN = "/login?notice=password_updated";

/** Reads one query parameter in the browser (the forms are prerendered, so no useSearchParams). */
export function readQueryParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}
