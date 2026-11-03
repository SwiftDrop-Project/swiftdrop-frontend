# SwiftDrop Frontend - project notes for Claude Code

Next.js (App Router) · TypeScript · Tailwind CSS.
Part of SwiftDrop, a parcel delivery & courier management system (university group project, 9 developers).
Related repos, cloned side by side: `../swiftdrop-backend` (Spring Boot API), `../swiftdrop-deploy` (docker-compose, docs).
Check package.json for exact versions and follow the conventions of the installed versions
(e.g. Tailwind v4 tokens go in `@theme` in globals.css; Next.js 16+ uses `proxy.ts` instead of `middleware.ts`).

## Design (strict)
- Follow `DESIGN.md` exactly. Screen references: `docs/design/01 Login.png`, `02 Register.png`, `03 Dashboard shell.png`.
- Colours, type sizes, spacing and radius come from theme tokens built from DESIGN.md.
  Never hard-code hex values in components.
- Font: IBM Plex Sans via `next/font/google` (weights 400, 500, 600).
- White surfaces, 1px borders, no gradients, no shadows except menus/dialogs, no emoji.
  Orange only for actions and active states, never for status.
- shadcn/ui components restyled to DESIGN.md, all in `src/components/ui` and shown on `/dev/ui`. Icons: lucide-react, 20px.
- Every page must work at 375px width. Auth pages hide the orange panel on small screens.
- Plain, specific wording ("Create delivery", "We couldn't log you in"), no marketing phrases.

## Structure (one feature per backend module)
```text
src/app/                 Routes only: thin page.tsx / layout.tsx files that compose feature components
  (auth)/                /login, /register, /register/complete, /auth/callback, /forgot-password, help, privacy, terms
  (public)/              /track, /track/[trackingNumber], /rates (no login needed)
  customer/ merchant/ courier/ dispatcher/   role areas in the app shell; sidebar menus in lib/navigation.ts
  dev/ui/                /dev/ui component gallery (404 in production)
src/features/<module>/   identity, merchants, pricing, delivery, dispatch, tracking, notifications, reporting, webhooks
  components/ hooks/ api.ts types.ts schemas.ts index.ts README.md
src/components/ui/       The ONLY place for base components (Button, Input, Table, StatusBadge, Dialog, Toast, ...)
src/components/layout/   App shell, sidebar, top bar, auth layout, PageHeader, page templates (ListPage, DetailPage, FormPage)
src/lib/                 Shared: api/client.ts (apiFetch), format.ts, validation.ts, reference.ts, roles.ts, navigation.ts
src/types/               Shared types only (API error, Role, District, ParcelStatus, PageResponse)
src/hooks/               Shared hooks only (useDistricts)
```

Rules:
- One feature folder per backend module (`com.swiftdrop.<module>`), same name, with a README.md (purpose,
  owner, backend module). A screen's code lives in the feature that owns its API.
- Import another feature ONLY through its `index.ts`: `import { MerchantApprovals } from "@/features/merchants"`.
  Inside a feature, import its own files with relative paths. Export what others need from `index.ts`.
- Pages in `src/app` stay thin: metadata + a page template + feature components. No fetching, no forms.
- Use only `components/ui` and the page templates in `components/layout`. If a component is missing, add it
  to `components/ui` in its own PR and show it on `/dev/ui`. Don't restyle ui components from a feature.
- `components/ui`, `lib`, `types` and `hooks` are shared layers: they never import features.
- `lib/api/client.ts` (`apiFetch`) is the ONLY code that calls `fetch`. Base URL from `NEXT_PUBLIC_API_URL`,
  always `credentials: "include"`, failures thrown as `ApiError` (API.md error shape). Each feature wraps it in its `api.ts`.
- Show money, dates, phone numbers and tracking numbers with `lib/format.ts` (Rs. amounts, Asia/Colombo time,
  +94 phones, "SD 2611 0048 17").
- Types match the backend DTOs: a feature's own in `features/<module>/types.ts`, shared ones in `src/types`.
- Forms: react-hook-form + zod (`features/<module>/schemas.ts`, built from `lib/validation.ts`), with the same
  rules and messages as the API contract.

Lint enforces these as errors (`eslint-rules/swiftdrop.mjs`, `eslint.config.mjs`):
- `swiftdrop/no-raw-colours`: no hex colours, rgb()/hsl(), arbitrary Tailwind colours (`bg-[#...]`) or arbitrary
  text sizes in src. Tokens live only in `src/app/globals.css`.
- `swiftdrop/feature-boundaries`: the import rules above.
- `radix-ui` only inside `components/ui`; no raw `<button>`, `<input>`, `<select>`, `<textarea>` in `src/app` or `src/features`.

## API contract
- `../swiftdrop-backend/API.md` (source of truth). Swagger: http://localhost:8080/swagger-ui.html

## Auth
- The backend sets the httpOnly cookie `SD_TOKEN`. Never store tokens in localStorage.
- The current user comes from `GET /api/v1/auth/me`.
- The route protection file (proxy.ts / middleware.ts) only reads the role from the cookie's JWT payload
  to redirect. It does not verify the token; the backend is the real security.

## Commands
- `npm run dev` (http://localhost:3000) · `npm run lint` · `npm run build`
- Run lint and build before finishing a task; fix all errors.
- `/dev/ui` (dev only) shows every ui component and page template in every state. Check new pages against it.

## Git
- Work on `feature/*` branches; PRs into `dev`, one feature (module) per PR. Commit style: `feat(delivery): add create delivery page`.
- Fill in `.github/pull_request_template.md`, including desktop and 375px screenshots.
