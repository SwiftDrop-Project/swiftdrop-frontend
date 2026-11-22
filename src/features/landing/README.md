# Landing feature

Public landing page for SwiftDrop visitors.

## Purpose
Renders the public home page at `/` for unauthenticated visitors.

Sections, top to bottom (`components/landing-view.tsx`):
- **Header** (`landing-header.tsx`): Track a parcel, Help, Log in (secondary) and Create account (primary); mobile menu.
- **Hero** (`landing-hero.tsx`): heading, the tracking form (the page's main action), a "Before you book a pickup"
  checklist (`landing-booking-checklist.tsx`, matching the Create delivery form's fields and limits) and the facts
  strip (`landing-facts.tsx`).
- **How a delivery works** (`landing-how-it-works.tsx`): three steps with the parcel statuses each one shows.
- **Coverage** (`landing-coverage.tsx`): the 25 districts by province (static list in `lib/coverage.ts`).
- **Customers and businesses** (`landing-audience.tsx`): what each account type offers.
- **CTA** (`landing-cta.tsx`) and **footer** (`landing-footer.tsx`).
- The "Ask SwiftDrop" assistant launcher, as on the other public pages.

All sections use `LandingContainer` (`components/landing-container.tsx`): full width up to 1920px with side padding
that grows from 16px on phones to 96px on large desktops, so wide screens don't show large empty margins.

The page makes no API calls of its own; only the tracking form navigates to `/track/{trackingNumber}`.

Logged-in users are redirected to their respective role dashboard by `src/proxy.ts` before reaching this view.
