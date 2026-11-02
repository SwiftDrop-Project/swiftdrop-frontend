import Link from "next/link";
import * as React from "react";
import { Logo } from "@/components/ui/logo";

const FOOTER_LINKS = [
  { href: "/help", label: "Help centre" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

const SCROLL_CONTAINER_ID = "auth-scroll";

/** On large screens the left column scrolls, not the window, so scroll both back to the top. */
export function scrollAuthPageToTop() {
  document.getElementById(SCROLL_CONTAINER_ID)?.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}

/**
 * Auth pages (DESIGN.md §4): form on the white left column, solid orange-500 panel with the
 * white logo on the right.
 *
 * - lg and up: the page is exactly one window tall. Only the left column scrolls; the panel
 *   (45% wide) stays put.
 * - Below lg: one column, no panel, normal page scrolling.
 * - The form block is centred between the logo and the footer when there is spare height,
 *   and starts 48px below the logo when there isn't. The footer always sits at the bottom.
 */
export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white lg:flex lg:h-dvh">
      {/* relative: keeps absolutely positioned helpers (e.g. Radix's hidden checkbox input)
          inside this column, so they can't make the whole window scroll. */}
      <div
        id={SCROLL_CONTAINER_ID}
        className="relative flex min-h-dvh flex-col px-4 py-10 short:py-8 lg:min-w-0 lg:flex-1 lg:overflow-y-auto lg:px-16 xl:px-20"
      >
        <Link href="/login" className="w-fit shrink-0 rounded-sm">
          <Logo priority className="h-8" />
        </Link>

        <main id="main" className="flex flex-1 flex-col py-12">
          <div className="my-auto w-full max-w-form">{children}</div>
        </main>

        <footer className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-grey-600">
          <span>© 2026 SwiftDrop</span>
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-sm hover:text-grey-900 hover:underline">
              {link.label}
            </Link>
          ))}
        </footer>
      </div>

      <div
        aria-hidden="true"
        className="hidden bg-orange-500 px-16 lg:flex lg:w-[45%] lg:shrink-0 lg:items-center lg:justify-center"
      >
        <Logo variant="white" className="h-auto w-full max-w-sm" />
      </div>
    </div>
  );
}

/** Simple page for auth-area links whose screen isn't built yet. */
export function AuthComingSoon({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <h1 className="text-display text-grey-900">{title}</h1>
      <p className="mt-2 text-body text-grey-600">{description}</p>
      {children}
    </div>
  );
}
