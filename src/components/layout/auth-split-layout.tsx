import Link from "next/link";
import * as React from "react";
import { Logo } from "@/components/brand/logo";

const FOOTER_LINKS = [
  { href: "/help", label: "Help centre" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/**
 * Auth pages (DESIGN.md §4): form on the white left half, solid orange-500 panel with the
 * white logo on the right. The panel is hidden below the lg breakpoint.
 */
export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[53fr_47fr]">
      <div className="flex min-h-dvh flex-col px-4 py-8 sm:px-10 lg:px-20 lg:py-10">
        <Link href="/login" className="w-fit rounded-sm">
          <Logo priority className="h-8" />
        </Link>

        <main id="main" className="w-full flex-1 pt-12 pb-16 lg:pt-20">
          {children}
        </main>

        <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-grey-600">
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
        className="hidden bg-orange-500 px-16 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:items-center lg:justify-center"
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
    <div className="flex max-w-form flex-col">
      <h1 className="text-display text-grey-900">{title}</h1>
      <p className="mt-2 text-body text-grey-600">{description}</p>
      {children}
    </div>
  );
}
