# Identity

User accounts and authentication: register, log in, log out, the current user (`/auth/me`), "Continue with Google" and finishing a Google sign-up.

| | |
|---|---|
| Backend module | `com.swiftdrop.identity` (`../swiftdrop-backend/src/main/java/com/swiftdrop/identity`) |
| Owner | Viduranga |
| Import as | `@/features/identity` (only what `index.ts` exports) |

## Built so far

- `/login`, `/register` (Customer and Merchant tabs), `/register/complete`, `/auth/callback`
- `CurrentUserProvider`, `useCurrentUser()`: the logged-in user for the app shell and pages
- `api.ts`: `authApi` (register, login, logout, me, completeProfile, googleSignInUrl)
- `schemas.ts`: login, register and complete-profile forms (same rules as API.md)

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
