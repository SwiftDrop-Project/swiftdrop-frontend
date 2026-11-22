import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import type { CourierError } from "../lib/errors";

/**
 * A courier screen that couldn't load. "Not found" (not yours, or a wrong link) offers a way back; anything else
 * offers "Try again".
 */
export function CourierLoadError({
  error,
  title,
  notFoundTitle,
  backHref,
  backLabel,
  onRetry,
}: {
  error: CourierError;
  /** e.g. "We couldn't load your tasks". */
  title: string;
  /** e.g. "This task isn't assigned to you". */
  notFoundTitle?: string;
  backHref?: string;
  backLabel?: string;
  onRetry: () => void;
}) {
  const notFound = error.kind === "not-found" && notFoundTitle !== undefined;
  return (
    <div className="flex flex-col items-start gap-4">
      <InlineNotice tone="error" title={notFound ? notFoundTitle : title}>
        {error.message}
      </InlineNotice>
      {notFound && backHref ? (
        <Button asChild variant="secondary">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      ) : (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
