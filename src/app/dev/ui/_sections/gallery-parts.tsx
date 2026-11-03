import * as React from "react";
import { cn } from "@/lib/utils";

/* Building blocks for the /dev/ui page itself. Not part of the UI kit. */

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-8 flex-col gap-8 border-b border-grey-200 py-12">
      <div className="flex max-w-2xl flex-col gap-1">
        <h2 id={`${id}-title`} className="text-h2 text-grey-900">
          {title}
        </h2>
        <div className="text-body-sm text-grey-600">{description}</div>
      </div>
      {children}
    </section>
  );
}

/** One labelled example: what state it shows, then the component(s). */
export function Example({
  label,
  children,
  className,
  stack = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Stack the children vertically instead of in a wrapping row. */
  stack?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-caption tracking-wider text-grey-500 uppercase">{label}</p>
      <div className={cn(stack ? "flex flex-col gap-4" : "flex flex-wrap items-center gap-3", className)}>
        {children}
      </div>
    </div>
  );
}

/** Grid of examples, one to three columns depending on the width. */
export function ExampleGrid({ children, columns = 3 }: { children: React.ReactNode; columns?: 2 | 3 }) {
  return (
    <div className={cn("grid gap-8", columns === 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>
      {children}
    </div>
  );
}

/** A framed area for showing a whole page template. */
export function Frame({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-grey-300 bg-white p-4 sm:p-8">{children}</div>;
}
