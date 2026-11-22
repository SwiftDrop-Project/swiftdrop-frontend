"use client";

import * as React from "react";
import { SidebarContent } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CurrentUserProvider, useCurrentUserState } from "@/features/identity";
import type { Role } from "@/types";

/**
 * Dashboard shell (docs/design/03 Dashboard shell.png): 248px sidebar, 64px top bar, content up to 1200px.
 * Below lg the sidebar becomes a drawer opened from the top bar.
 */
export function AppShell({ area, children }: { area: Role; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <CurrentUserProvider area={area}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md border border-grey-300 bg-white px-4 py-2 text-label focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar border-r border-grey-200 bg-white lg:block">
        <React.Suspense fallback={null}>
          <SidebarContent role={area} />
        </React.Suspense>
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Go to another part of SwiftDrop.</SheetDescription>
          <React.Suspense fallback={null}>
            <SidebarContent role={area} onNavigate={() => setMenuOpen(false)} />
          </React.Suspense>
        </SheetContent>
      </Sheet>

      <div className="min-h-dvh lg:pl-sidebar">
        <TopBar role={area} onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" tabIndex={-1} className="px-4 py-6 outline-none lg:px-8 lg:py-8">
          <div className="max-w-content">
            <ShellContent>{children}</ShellContent>
          </div>
        </main>
      </div>
    </CurrentUserProvider>
  );
}

/**
 * Keeps `children` (and Next.js's `<OuterLayoutRouter>` boundary) mounted while `GET /auth/me`
 * is loading so instant-navigation validation can render the active page segment, while
 * page-level `<RequireCurrentUser>` guards render structural skeletons and block protected UI
 * and API calls until an authorized, onboarded session is verified.
 */
function ShellContent({ children }: { children: React.ReactNode }) {
  const { state, retry, logoutError } = useCurrentUserState();

  return (
    <>
      {logoutError ? (
        <InlineNotice tone="error" title="We couldn't log you out" className="mb-6">
          {logoutError}
        </InlineNotice>
      ) : null}

      {state.status !== "error" ? children : null}

      {state.status === "error" ? (
        <div className="flex max-w-form-app flex-col items-start gap-4">
          <InlineNotice tone="error" title="We couldn't load your account">
            {state.message}
          </InlineNotice>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : null}
    </>
  );
}
