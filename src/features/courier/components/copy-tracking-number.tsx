"use client";

import { Copy } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { toast } from "@/components/ui/toast";
import { formatTrackingNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Copies a parcel's tracking number (as the system writes it, e.g. "SD2611016140", which the searches accept) and
 * confirms with a toast. A button of its own: it never opens the parcel or follows a link around it. When the browser
 * can't copy (no clipboard access, e.g. an insecure page), it says so and asks the courier to copy it by hand.
 */
export function CopyTrackingNumber({ trackingNumber, className }: { trackingNumber: string; className?: string }) {
  const shown = formatTrackingNumber(trackingNumber);

  async function copy(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    try {
      if (!navigator.clipboard) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(trackingNumber);
      toast({ tone: "success", title: "Tracking number copied", description: shown });
    } catch {
      toast({ tone: "error", title: "We couldn't copy the tracking number", description: `Select ${shown} and copy it.` });
    }
  }

  return (
    <IconButton
      type="button"
      variant="tertiary"
      label={`Copy tracking number ${shown}`}
      title="Copy tracking number"
      className={cn("-my-2", className)}
      onClick={copy}
    >
      <Copy />
    </IconButton>
  );
}
