"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { SiteContainer } from "@/components/layout/site-container";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/ui/logo";
import { HomeLink } from "./home-link";
import { NavLink } from "./nav-link";

const NAV_LINKS = [
  { href: "/track", label: "Track a parcel" },
  { href: "/help", label: "Help" },
  { href: "/login", label: "Log in" },
];

export function LandingHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [lastPathname, setLastPathname] = React.useState(pathname);
  const headerRef = React.useRef<HTMLElement>(null);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close the mobile menu on route changes (including browser Back/Forward navigation).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }

  React.useEffect(() => {
    if (!mobileMenuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    function onMediaChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    mediaQuery.addEventListener("change", onMediaChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      mediaQuery.removeEventListener("change", onMediaChange);
    };
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-30 border-b border-grey-200 bg-white">
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:border focus-visible:border-grey-300 focus-visible:bg-white focus-visible:px-4 focus-visible:py-2 focus-visible:text-label focus-visible:font-semibold focus-visible:text-grey-900 focus-visible:outline-2 focus-visible:outline-orange-600"
      >
        Skip to content
      </a>

      <SiteContainer className="flex h-topbar items-center justify-between gap-4">
        <HomeLink onNavigate={closeMobileMenu}>
          <Logo priority className="h-8" />
        </HomeLink>

        {/* Desktop navigation */}
        <nav aria-label="Main navigation" className="hidden items-center gap-3 md:flex">
          {NAV_LINKS.map((item) => (
            <NavLink key={item.href} href={item.href} variant="desktop">
              {item.label}
            </NavLink>
          ))}
          <Button asChild className="ml-2">
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
          {NAV_LINKS.map((item) => (
            <NavLink key={item.href} href={item.href} variant="mobile" onClick={closeMobileMenu}>
              {item.label}
            </NavLink>
          ))}
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
