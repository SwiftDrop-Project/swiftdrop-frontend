import { Building2, Check, PackageX, Truck, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTrackingNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { actionId, actionLabel, isProblemAction, parcelActions, type ParcelAction } from "../lib/parcel-actions";
import type { CourierDelivery } from "../types";

/**
 * The buttons for one parcel: one per status the API allows now (`nextStatuses`, in its order) and "Unable to
 * Collect" while `canMarkUnableToCollect`. The first step that goes as hoped is the main (orange) button; problems
 * (failed, unable to collect) are secondary, with their icon in the error colour (the label still says what it is).
 * Renders nothing when the API offers no action.
 *
 * Layout follows the space the buttons actually get (a container query on this block, not the screen width): two
 * buttons sit side by side in equal columns from one shared width (SIDE_BY_SIDE), and stack full width below it, so
 * a label is never squeezed or clipped. One button always takes the full width.
 */
export function ParcelActionButtons({
  delivery,
  busy = false,
  onAction,
  className,
}: {
  delivery: Pick<CourierDelivery, "trackingNumber" | "nextStatuses" | "canMarkUnableToCollect" | "task">;
  /** Another update is being saved or the list is reloading: the buttons wait. */
  busy?: boolean;
  /** Opens the form for that action. Without it the buttons are shown disabled. */
  onAction?: (action: ParcelAction) => void;
  className?: string;
}) {
  const actions = parcelActions(delivery);
  if (actions.length === 0) return null;
  const main = actions.find((action) => !isProblemAction(action));
  const labels = actions.map((action) => actionLabel(action, delivery));
  // Every pair uses the same threshold (see SIDE_BY_SIDE).

  return (
    <div className={cn("@container", className)} aria-label={`Actions for ${formatTrackingNumber(delivery.trackingNumber)}`}>
      <div className={cn("grid grid-cols-1 gap-2", actions.length > 1 && SIDE_BY_SIDE)}>
        {actions.map((action, index) => (
          <Button
            key={actionId(action)}
            type="button"
            variant={action === main ? "primary" : "secondary"}
            className="group h-11 w-full min-w-0 gap-1.5 px-2"
            disabled={!onAction || busy}
            onClick={() => onAction?.(action)}
          >
            <ActionIcon action={action} returning={delivery.task.type === "DELIVERY"} />
            {labels[index]}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * One threshold for every pair, so cards of the same width (one grid row) always make the same choice: all pairs side
 * by side, or all stacked. It is set by the widest pair, "Out for delivery" + "Unable to Collect": per button about
 * 0.44rem per character (IBM Plex Sans averages 0.451em per character; ~0.43rem at 14px semibold, plus a margin) and
 * 2.75rem for the 20px icon, the 6px icon gap, 8px minimum padding on both sides and the border, plus the 0.5rem gap
 * between the buttons: ≈ 20.5rem, so 21.5rem leaves room. The other pairs ("Mark picked up" + "Unable to Collect",
 * "Delivered" + "Failed") are narrower. The parcel grid only uses 2 or 3 columns when each card is at least this wide,
 * so pairs stack only in the one-column phone layout.
 */
const SIDE_BY_SIDE = "@[21.5rem]:grid-cols-2";

/** Problem actions get the error colour on their icon (grey again while the button is disabled). */
const PROBLEM_ICON = "text-error group-disabled:text-grey-400";

function ActionIcon({ action, returning }: { action: ParcelAction; returning: boolean }) {
  switch (action.kind) {
    case "unable":
      return <PackageX className={PROBLEM_ICON} aria-hidden="true" />;
    case "failed":
      return <X className={PROBLEM_ICON} aria-hidden="true" />;
    case "handover":
      return returning ? <Undo2 aria-hidden="true" /> : <Building2 aria-hidden="true" />;
    case "confirm":
      return action.status === "PICKED_UP" ? <Check aria-hidden="true" /> : <Truck aria-hidden="true" />;
    case "delivered":
      return <Check aria-hidden="true" />;
  }
}
