import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { UNAVAILABLE_TITLE, type CourierError } from "../lib/errors";

/**
 * A screen that couldn't load. 503 (parcels aren't on the server yet) is an info notice, anything else an
 * error notice; both with "Try again".
 */
export function LoadError({
  error,
  title,
  onRetry,
}: {
  error: CourierError;
  /** Title for errors other than 503, e.g. "We couldn't load your deliveries". */
  title: string;
  onRetry: () => void;
}) {
  const unavailable = error.kind === "unavailable";
  return (
    <div className="flex flex-col items-start gap-4">
      <InlineNotice tone={unavailable ? "info" : "error"} title={unavailable ? UNAVAILABLE_TITLE : title}>
        {error.message}
      </InlineNotice>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
