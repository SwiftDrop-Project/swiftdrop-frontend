import Link from "next/link";
import * as React from "react";

const FOOTER_LINKS = [
  { href: "/help", label: "Help" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-grey-200 bg-white py-8">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8 text-body-sm text-grey-600">
        <span>© 2026 SwiftDrop</span>
        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm hover:text-grey-900 hover:underline focus-visible:outline-2 focus-visible:outline-orange-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

