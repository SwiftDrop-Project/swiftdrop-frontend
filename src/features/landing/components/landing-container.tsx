import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Landing page container: uses the full window width up to 1920px, with side padding that grows with the screen
 * (16px phone · 24px small tablet · 32px tablet · 48px laptop · 64px desktop · 96px large desktop).
 * Wider than SiteContainer (1440px) so large screens don't show wide empty margins.
 */
export function LandingContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1920px] px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-24", className)}>
      {children}
    </div>
  );
}
