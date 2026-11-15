"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { SiteContainer } from "@/components/layout/site-container";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/ui/logo";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-grey-200 bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-grey-300 focus:bg-white focus:px-4 focus:py-2 focus:text-label focus:font-semibold focus:text-grey-900 focus:outline-2 focus:outline-orange-600"
      >
        Skip to content
      </a>

      <SiteContainer className="flex h-topbar items-center justify-between gap-4">
        <Link
          href="/"
          className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2"
        >
          <Logo priority className="h-8" />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          <Link
            href="/track"
            className="rounded-sm text-label text-grey-700 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2"
          >
            Track a parcel
          </Link>
          <Link
            href="/help"
            className="rounded-sm text-label text-grey-700 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2"
          >
            Help
          </Link>
          <Link
            href="/login"
            className="rounded-sm text-label text-grey-700 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2"
          >
            Log in
          </Link>
          <Button asChild>
            <Link href="/register">Create account</Link>
          </Button>
        </nav>

        {/* Mobile menu toggle (>= 44px tap target) */}
        <div className="md:hidden">
          <IconButton
            ref={menuButtonRef}
            variant="tertiary"
            label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
            className="size-11"
          >
            {mobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </IconButton>
        </div>
      </SiteContainer>

      {/* Mobile navigation menu */}
      {mobileMenuOpen ? (
        <nav
          id="landing-mobile-menu"
          aria-label="Mobile navigation"
          className="flex flex-col gap-1 border-t border-grey-200 bg-white px-4 py-4 sm:px-6 md:hidden"
        >
          <Link
            href="/track"
            onClick={closeMobileMenu}
            className="flex min-h-11 items-center rounded-md px-2 text-label text-grey-700 hover:bg-grey-50 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600"
          >
            Track a parcel
          </Link>
          <Link
            href="/help"
            onClick={closeMobileMenu}
            className="flex min-h-11 items-center rounded-md px-2 text-label text-grey-700 hover:bg-grey-50 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600"
          >
            Help
          </Link>
          <Link
            href="/login"
            onClick={closeMobileMenu}
            className="flex min-h-11 items-center rounded-md px-2 text-label text-grey-700 hover:bg-grey-50 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600"
          >
            Log in
          </Link>
          <div className="pt-2">
            <Button asChild size="lg" className="w-full">
              <Link href="/register" onClick={closeMobileMenu}>
                Create account
              </Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
