# SwiftDrop Frontend

The web app for SwiftDrop, a parcel delivery and courier management system for Sri Lanka.
Customers, merchants, couriers and the admin (dispatcher) each get their own area.

- Whole-project setup, Docker and team workflow: [swiftdrop-deploy](https://github.com/SwiftDrop-Project/swiftdrop-deploy)
- API and its contract: [swiftdrop-backend](https://github.com/SwiftDrop-Project/swiftdrop-backend) and its
  [API.md](https://github.com/SwiftDrop-Project/swiftdrop-backend/blob/dev/API.md)
- Design system: [DESIGN.md](DESIGN.md) and the screens in [docs/design](docs/design)
- Coding rules: [CLAUDE.md](CLAUDE.md)

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, with design tokens in `src/app/globals.css` |
| Components | shadcn/ui (Radix UI), restyled to DESIGN.md; icons from lucide-react |
| Forms | react-hook-form and zod 4, with the same rules and messages as the API |
| Font | IBM Plex Sans (400, 500, 600) via `next/font/google` |
| Lint | ESLint with the Next.js config |

Next.js 16 differs from older versions you may know. For example, route protection lives in
`src/proxy.ts` (it used to be `middleware.ts`). When in doubt, read the docs that come with the
installed version in `node_modules/next/dist/docs/`.

## Folder structure

```text
src/
├── app/                      Routes (one folder per URL)
│   ├── (auth)/               Pages with the split auth layout (form left, orange panel right)
│   │   ├── login/            /login
│   │   ├── register/         /register, and register/complete/ for finishing a Google sign-up
│   │   ├── auth/callback/    /auth/callback, where the backend sends users after Google sign-in
│   │   └── forgot-password/, help/, privacy/, terms/
│   ├── customer/             Customer area (/customer/...)
│   ├── merchant/             Merchant area (/merchant/...)
│   ├── courier/              Courier area (/courier/...)
│   ├── dispatcher/           Admin area (/dispatcher/...)
│   ├── track/                Public parcel tracking (coming soon)
│   ├── globals.css           Design tokens (colours, type, radius) - the only place they are defined
│   └── layout.tsx            Root layout and font
├── components/
│   ├── ui/                   Base components: Button, Input, Checkbox, Table, ...
│   ├── forms/                FormField, PhoneInput, PasswordInput, NativeSelect, SegmentedControl
│   ├── layout/               App shell (sidebar, top bar), auth layout, current user
│   ├── feedback/             Notice, EmptyState, ComingSoon
│   ├── auth/                 Login, register, Google sign-in, complete-profile
│   └── admin/, customer/, brand/
├── hooks/                    Reusable hooks, e.g. useDistricts
├── lib/
│   ├── api/                  The only code that calls the backend (apiFetch, authApi, adminApi, metaApi)
│   ├── validation.ts         zod schemas and messages, same as API.md
│   ├── navigation.ts         Sidebar menu for each role
│   ├── roles.ts              Role → home page, safe redirects after login
│   └── google-sign-in.ts     Google button flag, saved account type, ?error messages
├── types/                    TypeScript types matching the backend DTOs in API.md
└── proxy.ts                  Route protection (redirects only)
```

## Design system

The design is strict. Follow [DESIGN.md](DESIGN.md) and the screen references:

- `docs/design/01 Login.png`, `docs/design/02 Register.png`, `docs/design/03 Dashboard shell.png`
- `docs/design/Design system.png`

The short version:

- Colours, type sizes, spacing and radius come from tokens in `src/app/globals.css`. Use the generated
  classes (`bg-orange-700`, `text-grey-600`, `text-h1`, `rounded-md`). Never write hex values in
  components. Tailwind's default colours are removed, so a class that isn't in DESIGN.md doesn't exist.
- White surfaces, 1px borders, no gradients, no shadows (except menus and dialogs), no emoji.
- Orange is only for actions and active states. Never for status.
- One primary button per view. Button labels are verbs ("Create delivery", "Log in").
- Icons: lucide-react at 20px.
- Every page must work at 375px wide.
- Plain, specific wording ("We couldn't log you in"), no marketing phrases.

## Run locally

You need Node.js 22 LTS and a running backend. Start the backend first: either everything in Docker
(Option A) or the backend from its own repo (Option B). Both are described in the
[swiftdrop-deploy README](https://github.com/SwiftDrop-Project/swiftdrop-deploy). If the frontend
container from Option A is running, stop it first (it also uses port 3000):
`docker compose stop frontend` in `swiftdrop-deploy`.

Git Bash:

```bash
cp .env.example .env.local
npm install
npm run dev
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. Log in with a demo account, for example `customer@swiftdrop.lk` with your
`DEMO_PASSWORD` (the full list is in the swiftdrop-deploy README).

Restart `npm run dev` after you change `.env.local`.

If PowerShell says `npm.ps1 cannot be loaded because running scripts is disabled`, run this once and
try again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Environment variables

`.env.local` is git-ignored. `.env.example` lists every variable.

| Variable | Example | What it does |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api/v1` | The backend API. Required: without it every API call fails with "We couldn't reach SwiftDrop". Use `localhost`, not `127.0.0.1`, so the login cookie works. |
| `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED` | `false` | `true` shows "Continue with Google". Set it to `true` only when the backend has Google credentials. |

`NEXT_PUBLIC_` values are copied into the JavaScript when the app is built. After a change, restart
`npm run dev`, or rebuild the Docker image. Never put a secret in a `NEXT_PUBLIC_` variable: everyone
can read it in the browser.

## How auth works in the frontend

**The cookie.** The backend sets the httpOnly cookie `SD_TOKEN` when you log in, register as a customer,
or sign in with Google. JavaScript can't read it. The frontend never stores tokens (no `localStorage`).
`apiFetch` in `src/lib/api/client.ts` is the only place that calls `fetch`. It always sends
`credentials: "include"`, so the browser adds the cookie to every API call.

**The current user.** Pages in the role areas are wrapped in `AppShell`. Its `CurrentUserProvider` calls
`GET /api/v1/auth/me` and shares the user with the page (`useCurrentUser()`).

| `/auth/me` result | What happens |
|---|---|
| The user, right area | The page shows the user's details (name in the top bar and welcome heading) |
| `401` (no cookie, expired) | Clears the cookie and goes to `/login?next=<this page>` |
| The user has another role | Goes to that role's home page |
| Status `PROFILE_INCOMPLETE` | Goes to `/register/complete` |
| Any other error | Shows "We couldn't load your account" with a **Try again** button |

**Route protection.** `src/proxy.ts` runs before a page loads. It reads `role` and `status` from the
`SD_TOKEN` payload **without checking the signature**, so it only decides where to send you. The backend
checks every API call; that is the real security.

| You open | Without a valid token | With a token |
|---|---|---|
| `/customer/...`, `/merchant/...`, `/courier/...`, `/dispatcher/...` | `/login?next=<that page>` | Your own area only. Other areas redirect to your home page. |
| `/login`, `/register`, `/` | Shown (`/` goes to `/login`) | Redirect to your home page |
| `/register/complete` | `/login` | Shown only if your status is `PROFILE_INCOMPLETE`, otherwise your home page |
| Any area, `/login`, `/register` or `/` with status `PROFILE_INCOMPLETE` | | `/register/complete` |

Home pages by role: `CUSTOMER` → `/customer`, `MERCHANT` → `/merchant`, `COURIER` → `/courier`,
`ADMIN` → `/dispatcher`. After a password login, `?next=` is used only if it points into the user's own
area (`getSafeNext` in `src/lib/roles.ts`).

**Google sign-in.**

1. **Continue with Google** (`src/components/auth/google-sign-in.tsx`) appears below the main button
   on `/login` and on both `/register` tabs when `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED` is `true`.
2. On click it saves the chosen account type (`customer` or `merchant`; login saves `customer`) in
   `sessionStorage`, shows a spinner, and does a full-page navigation to
   `http://localhost:8080/oauth2/authorization/google` (the backend origin from `NEXT_PUBLIC_API_URL`).
3. After Google, the backend sets the cookie and sends the browser to `/auth/callback`. That page calls
   `/auth/me`:
   - status `PROFILE_INCOMPLETE` (a new Google user) → `/register/complete`
   - anyone else → their role's home page
   - an error → `/login?error=google_failed`
4. `/register/complete` ("Finish setting up your account") shows the Google name and email and the
   Customer / Merchant switch, pre-selected from `sessionStorage`.
   - Customer: mobile number and terms. After `POST /auth/complete-profile` the user goes to `/customer`.
   - Merchant: the business fields from `/register` (contact person prefilled with the Google name),
     without email and password. Afterwards the "Application received" screen is shown and the user
     waits for approval.
   - **Use another account** logs out, for someone who picked the wrong Google account.
   - The forms reuse the zod schemas and field components from `/register`, so the rules are the same.
5. When Google sign-in fails, the backend redirects to `/login?error=<code>`. The login page shows a
   notice, then removes `?error` from the address bar.

| `?error=` | Notice |
|---|---|
| `google_failed` | We couldn't sign you in with Google. Try again, or log in with your mobile number or email. |
| `account_pending_approval` | Your account is waiting for approval |
| `account_rejected` | Your merchant application wasn't approved |
| `account_disabled` | This account is disabled |

## Adding a new page

This example builds the customer **Addresses** page, which currently shows "coming soon".

**1. Create or replace the page file.** The folder is the URL. Pages inside `src/app/customer/` are
already protected and wrapped in the app shell by `src/app/customer/layout.tsx`.

`src/app/customer/addresses/page.tsx`:

```tsx
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Card, PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Addresses" };

export default function AddressesPage() {
  return (
    <>
      <PageHeader
        title="Addresses"
        description="Save pickup and delivery addresses so you don't have to type them each time."
      />
      <Card className="p-6 sm:p-8">
        <EmptyState
          icon={MapPin}
          title="No saved addresses"
          description="Addresses you save will be listed here."
        />
      </Card>
    </>
  );
}
```

**2. Add it to the menu** in `src/lib/navigation.ts` (title, href, a lucide icon and a one-line
description). Every menu item must have a `page.tsx`, so no link is broken.

**3. Call the API from `src/lib/api`.** Add a file such as `src/lib/api/addresses.ts` that uses
`apiFetch`, export it from `src/lib/api/index.ts`, and add the response types to `src/types` exactly as
API.md describes them. Never call `fetch` anywhere else. Call the API from client components
(`"use client"`), because the browser holds the login cookie.

**4. Build forms the same way as login and register.** Put the zod schema in `src/lib/validation.ts`
with the messages from API.md. Use `FormField` with `Input`, `PhoneInput` or `NativeSelect`. Show server
`fieldErrors` with `applyServerFieldErrors` from `src/lib/form-errors.ts`, and other errors in a
`Notice`.

**5. Follow the design rules.** Use tokens only, one primary button, `EmptyState` for empty lists,
`Notice` for messages. Check the page at 375px wide.

**6. Run the checks:** `npm run lint` and `npm run build`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the development server at http://localhost:3000, with live reload |
| `npm run lint` | Checks the code with ESLint |
| `npm run build` | Builds the production version and checks types. Run it before every PR. |
| `npm run start` | Runs the production build from `npm run build` |

## Docker

The `Dockerfile` builds the app with `output: "standalone"` and runs it as a non-root user on port 3000.
`NEXT_PUBLIC_*` values are build arguments, because they are built into the JavaScript.

Through Docker Compose (from `swiftdrop-deploy`; values come from its `.env`):

```bash
docker compose up -d --build frontend
```

Or build only the image (from this folder; one line, works in Git Bash and PowerShell):

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 --build-arg NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=false -t swiftdrop-frontend .
```

`.env` and `.env.local` are in `.dockerignore`, so local settings never end up in the image.

## Roadmap

Built today: login, register (customer and merchant), Google sign-in with the complete-profile step,
merchant approvals for the admin, and a home page for each role. These are planned and show a
"coming soon" screen for now:

- Customer: create delivery, my deliveries, track a parcel, addresses, payments, settings
- Merchant: orders, create order, API keys, webhooks, settings
- Courier: delivery history, settings, and the list of today's deliveries
- Admin: unassigned parcels, couriers, zones and pricing, users, reports
- Public parcel tracking at `/track`, password reset, help, terms and privacy pages
