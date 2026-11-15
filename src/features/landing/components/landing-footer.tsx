"use client";

import Link from "next/link";
import * as React from "react";
import { SiteContainer } from "@/components/layout/site-container";
import { Logo } from "@/components/ui/logo";
import { SUPPORT_EMAIL } from "@/features/info";
import { HomeLink } from "./home-link";

function subscribeToNothing() {
  return () => {};
}

function useCurrentYear(): number {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => new Date().getFullYear(),
    () => 2026,
  );
}

const SEND_LINKS = [
  { href: "/track", label: "Track a parcel" },
  { href: "/register", label: "Create account" },
  { href: "/register?type=business", label: "Register a business" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function LandingFooter() {
  const year = useCurrentYear();

  return (
    <footer className="border-t border-grey-200 bg-white py-10 sm:py-12">
      <SiteContainer>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h2 className="text-label font-semibold text-grey-900">Send</h2>
            <ul className="flex flex-col gap-2 text-body-sm text-grey-600">
              {SEND_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-8 items-center rounded-sm hover:text-grey-900 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-label font-semibold text-grey-900">Support</h2>
            <ul className="flex flex-col gap-2 text-body-sm text-grey-600">
              <li>
                <Link
                  href="/help"
                  className="inline-flex min-h-8 items-center rounded-sm hover:text-grey-900 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600"
                >
                  Help
                </Link>
              </li>
              <li className="min-w-0">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex min-h-8 max-w-full flex-col items-start rounded-sm break-words hover:text-grey-900 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600"
                >
                  <span>Email us</span>
                  <span className="break-all text-grey-700">{SUPPORT_EMAIL}</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-label font-semibold text-grey-900">Legal</h2>
            <ul className="flex flex-col gap-2 text-body-sm text-grey-600">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-8 items-center rounded-sm hover:text-grey-900 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-grey-200 pt-6 sm:flex-row sm:items-center text-body-sm text-grey-600">
          <HomeLink>
            <Logo className="h-6" />
          </HomeLink>
          <span>© {year} SwiftDrop</span>
        </div>
      </SiteContainer>
    </footer>
  );
}
