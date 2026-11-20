# Landing feature

Public landing page for SwiftDrop visitors.

## Purpose
Renders the public home page at `/` for unauthenticated visitors. Provides quick parcel tracking without logging in, an overview of the delivery workflow, links to log in or create an account, district coverage information, and public footer links.

Logged-in users are redirected to their respective role dashboard by `src/proxy.ts` before reaching this view.

