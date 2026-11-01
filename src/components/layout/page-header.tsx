import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

/** Page title (Heading 1) with a one-line description. */
export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-1", className)}>
      <h1 className="text-h1 text-grey-900">{title}</h1>
      {description ? <p className="text-body text-grey-600">{description}</p> : null}
    </header>
  );
}

/** White panel with a 1px border, no shadow (DESIGN.md §5). */
export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-lg border border-grey-200 bg-white", className)} {...props} />;
}
