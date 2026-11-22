import { InlineNotice } from "@/components/ui/inline-notice";
import { COURIER_PREVIEW } from "../preview/flag";

/**
 * Shown on every courier page while development preview mode is on (preview/flag.ts); renders nothing otherwise.
 */
export function CourierPreviewBanner() {
  if (!COURIER_PREVIEW) return null;
  return (
    <InlineNotice tone="info" title="Preview mode: sample data, nothing is sent to the server" className="mb-6">
      These parcels are made up for checking the courier screens. Your updates change only this
      browser&apos;s copy, and reloading the page starts again. To use the real API, remove
      NEXT_PUBLIC_COURIER_PREVIEW from .env.local and restart npm run dev.
    </InlineNotice>
  );
}
