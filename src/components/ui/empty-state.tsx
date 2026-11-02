import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** One primary button (DESIGN.md §10), optionally followed by a secondary one. */
  actions?: React.ReactNode;
  /** "lg" uses Heading 2, for the main card of a page. */
  size?: "default" | "lg";
  headingLevel?: "h2" | "h3";
  className?: string;
}

/** Empty state: icon in a grey box, title, one-line explanation, action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  size = "default",
  headingLevel = "h2",
  className,
}: EmptyStateProps) {
  const Heading = headingLevel;
  return (
    <div className={cn("flex flex-col items-start", className)}>
      <div className="flex size-12 items-center justify-center rounded-lg border border-grey-200 bg-grey-50 text-grey-700">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <Heading className={cn("mt-6", size === "lg" ? "text-h2" : "text-h3")}>{title}</Heading>
      <p className={cn("mt-2 max-w-xl text-grey-600", size === "lg" ? "text-body" : "text-body-sm")}>
        {description}
      </p>
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
