"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface HomeLinkProps {
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
}

/**
 * SwiftDrop logo link to "/".
 * When already on "/", prevents reload, scrolls to top (honouring reduced motion),
 * and moves focus back to the top of the page for keyboard users.
 */
export function HomeLink({ children, className, onNavigate }: HomeLinkProps) {
  const pathname = usePathname();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();
    if (pathname !== "/") return;

    event.preventDefault();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });

    const topTarget =
      document.querySelector<HTMLElement>('a[href="#main"]') ?? document.querySelector<HTMLElement>("h1");
    topTarget?.focus({ preventScroll: true });
  }

  return (
    <Link
      href="/"
      aria-label="SwiftDrop home"
      onClick={handleClick}
      className={cn(
        "inline-flex shrink-0 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2",
        className,
      )}
    >
      {children}
    </Link>
  );
}

