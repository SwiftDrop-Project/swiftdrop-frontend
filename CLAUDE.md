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
- shadcn/ui components restyled to DESIGN.md. Icons: lucide-react, 20px.
- Every page must work at 375px width. Auth pages hide the orange panel on small screens.
- Plain, specific wording ("Create delivery", "We couldn't log you in"), no marketing phrases.

## Structure
- `src/app`: routes. `(auth)` group for `/login`, `/register`; role areas `/customer`, `/merchant`, `/courier`, `/dispatcher`.
- `src/components/ui`: base components · `src/components/layout`: app shell (sidebar, top bar).
- `src/lib/api`: the ONLY place that calls `fetch`. Base URL from `NEXT_PUBLIC_API_URL`, always `credentials: "include"`.
- `src/types`: TypeScript types matching the backend DTOs.
- Forms: react-hook-form + zod, using the same validation rules and messages as the API contract.

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

## Git
- Work on `feature/*` branches; PRs into `dev`. Commit style: `feat(auth): add login page`.
