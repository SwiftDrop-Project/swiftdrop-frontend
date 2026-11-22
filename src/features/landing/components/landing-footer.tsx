"use client";

import Link from "next/link";
import * as React from "react";
import { Logo } from "@/components/ui/logo";
import { SUPPORT_EMAIL } from "@/features/info";
import { HomeLink } from "./home-link";
import { LandingContainer } from "./landing-container";

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

const LINK_CLASS =
  "inline-flex min-h-8 items-center rounded-sm hover:text-grey-900 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600";

const LINK_GROUPS = [
  {
    title: "Send",
    links: [
      { href: "/track", label: "Track a parcel" },
      { href: "/register", label: "Create account" },
      { href: "/register?type=business", label: "Register a business" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/forgot-password", label: "Reset your password" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function LandingFooter() {
  const year = useCurrentYear();

  return (
    <footer className="border-t border-grey-200 bg-white py-10 sm:py-12">
      <LandingContainer>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-5">
            <HomeLink>
              <Logo className="h-7" />
            </HomeLink>
            <p className="max-w-sm text-body-sm text-grey-600">
              Parcel pickup and delivery through our branches in all 25 districts of Sri Lanka.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex min-h-8 w-fit max-w-full items-center rounded-sm text-body-sm break-all text-grey-700 hover:text-grey-900 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          {LINK_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="flex flex-col gap-3 lg:col-span-2">
              <h2 className="text-label font-semibold text-grey-900">{group.title}</h2>
              <ul className="flex flex-col gap-2 text-body-sm text-grey-600">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={LINK_CLASS}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-grey-200 pt-6 text-body-sm text-grey-600">
          <span>© {year} SwiftDrop</span>
        </div>
      </LandingContainer>
    </footer>
  );
}
