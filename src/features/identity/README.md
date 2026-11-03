# Identity

User accounts and authentication: register, log in, log out, the current user (`/auth/me`), "Continue with Google" and finishing a Google sign-up.

| | |
|---|---|
| Backend module | `com.swiftdrop.identity` (`../swiftdrop-backend/src/main/java/com/swiftdrop/identity`) |
| Owner | Viduranga |
| Import as | `@/features/identity` (only what `index.ts` exports) |

## Built so far

- `/login`, `/register` (Customer and Merchant tabs), `/register/complete`, `/auth/callback`
- `/verify-email`: the 6-digit code after sign-up (auto-submits, resend with a 60 s countdown). Customers are
  logged in; merchants see "Application received". Without `?email=` it asks for the address first.
- `/forgot-password` (email only) → `/reset-password?email=…` (no email → back to `/forgot-password`): reset with an emailed code; success goes to `/login?notice=password_updated`
- `AccountSettings` (Change password) on `/customer|merchant|courier|dispatcher/settings`
- `CurrentUserProvider`, `useCurrentUser()`: the logged-in user for the app shell and pages
- `api.ts`: `authApi` (register, verifyEmail, resendVerification, login, logout, me, forgotPassword,
  resetPassword, changePassword, completeProfile, googleSignInUrl)
- `schemas.ts`: login, register, complete-profile, verify, forgot/reset/change password (same rules as API.md)
- `lib/email.ts`: typo suggestions ("Did you mean name@gmail.com?") and `a•••@gmail.com` masking
- `lib/cooldown.ts`: countdowns kept in sessionStorage (resend cooldown, 429 Retry-After)

## Layout

```text
identity/
├── components/   React components for this feature's screens
├── hooks/        Hooks used by those components
├── lib/          Helpers only this feature uses (google-sign-in.ts)
├── api.ts        Endpoints, built on apiFetch from @/lib/api
├── types.ts      Types matching the backend DTOs
├── schemas.ts    zod schemas for this feature's forms
└── index.ts      Public exports: the only file other code may import
```

Rules (see CLAUDE.md): pages in `src/app` stay thin and compose the components exported here. Build
screens only from `@/components/ui` and the page templates in `@/components/layout`. Import another
feature only through its `index.ts`; import this feature's own files with relative paths.
