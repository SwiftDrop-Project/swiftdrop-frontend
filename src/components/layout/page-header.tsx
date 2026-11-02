import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The page's primary action (one primary Button), right of the title on wider screens. */
  action?: React.ReactNode;
  /** Shown next to the title, e.g. a StatusBadge on a detail page. */
  status?: React.ReactNode;
  /** "Back to deliveries" link above the title, for detail and form pages. */
  backHref?: string;
  backLabel?: string;
  className?: string;
}

/** Page title (Heading 1) with a one-line description and an optional primary action. */
export function PageHeader({
  title,
  description,
  action,
  status,
  backHref,
  backLabel = "Back",
  className,
}: PageHeaderProps) {
  const heading = (
    <div className="flex min-w-0 flex-col gap-1">
      {status ? (
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h1 text-grey-900">{title}</h1>
          {status}
        </div>
      ) : (
        <h1 className="text-h1 text-grey-900">{title}</h1>
      )}
      {description ? <p className="text-body text-grey-600">{description}</p> : null}
    </div>
  );

  return (
    <header className={cn("mb-8 flex flex-col gap-4", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1 rounded-sm text-label text-grey-700 hover:text-grey-900 hover:underline"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          {backLabel}
        </Link>
      ) : null}
      {action ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {heading}
          <div className="flex shrink-0 flex-wrap gap-3">{action}</div>
        </div>
      ) : (
        heading
      )}
    </header>
  );
}
