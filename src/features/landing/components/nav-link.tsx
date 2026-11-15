"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "desktop" | "mobile";
  onClick?: () => void;
}

/** Header navigation link with shared active highlighting matching the app shell sidebar. */
export function NavLink({ href, children, variant = "desktop", onClick }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-label transition-colors focus-visible:outline-2 focus-visible:outline-orange-600",
        variant === "desktop" && [
          "rounded-md px-2.5 py-1.5 focus-visible:outline-offset-2",
          active ? "bg-orange-50 font-semibold text-orange-800" : "text-grey-700 hover:text-grey-900",
        ],
        variant === "mobile" && [
          "flex min-h-11 items-center rounded-md px-2",
          active
            ? "bg-orange-50 font-semibold text-orange-800"
            : "text-grey-700 hover:bg-grey-50 hover:text-grey-900",
        ],
      )}
    >
      {children}
    </Link>
  );
}

