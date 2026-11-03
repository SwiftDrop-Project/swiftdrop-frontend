/* Links between the identity screens, built in one place. */

/** /verify-email for this address; without an email the page first asks for it. */
export function verifyEmailHref(email?: string): string {
  return email ? `/verify-email?${new URLSearchParams({ email })}` : "/verify-email";
}

/** /reset-password for the email the code was sent to. */
export function resetPasswordHref(email: string): string {
  return `/reset-password?email=${encodeURIComponent(email)}`;
}

/** After a password reset, /login shows "Password updated. Log in with your new password." */
export const PASSWORD_UPDATED_LOGIN = "/login?notice=password_updated";

/** Reads one query parameter in the browser (the forms are prerendered, so no useSearchParams). */
export function readQueryParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}
