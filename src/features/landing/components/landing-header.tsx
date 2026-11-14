"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/ui/logo";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-grey-200 bg-white">
      <div className="mx-auto flex h-topbar max-w-content items-center justify-between px-4 sm:px-8">
        <Link
          href="/"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2"
        >
          <Logo priority className="h-8" />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
          <Link
            href="/track"
            className="text-label text-grey-700 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2 rounded-sm"
          >
            Track a parcel
          </Link>
          <Link
            href="/login"
            className="text-label text-grey-700 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2 rounded-sm"
          >
            Log in
          </Link>
          <Button asChild>
            <Link href="/register">Create account</Link>
          </Button>
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <IconButton
            variant="tertiary"
            label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </IconButton>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {mobileMenuOpen && (
        <nav
          id="landing-mobile-menu"
          aria-label="Mobile navigation"
          className="md:hidden border-t border-grey-200 bg-white px-4 py-4 flex flex-col gap-3"
        >
          <Link
            href="/track"
            onClick={closeMobileMenu}
            className="rounded-sm py-2 text-label text-grey-700 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600"
          >
            Track a parcel
          </Link>
          <Link
            href="/login"
            onClick={closeMobileMenu}
            className="rounded-sm py-2 text-label text-grey-700 hover:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600"
          >
            Log in
          </Link>
          <div className="pt-2">
            <Button asChild className="w-full">
              <Link href="/register" onClick={closeMobileMenu}>
                Create account
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}

