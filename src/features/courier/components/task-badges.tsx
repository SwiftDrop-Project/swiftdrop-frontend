import { ArrowLeftRight, PackagePlus, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE } from "../lib/labels";
import { deliveryStatus } from "../lib/parcel-status";
import type { AssignmentStatus, AssignmentType, CourierDelivery } from "../types";

/** Where the whole dispatch task is: dot + word, never orange (same words and tones as the dispatcher's screens). */
export function TaskStatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge tone={ASSIGNMENT_STATUS_TONE[status]}>{ASSIGNMENT_STATUS_LABEL[status]}</Badge>;
}

/** The one status a courier sees for a parcel: "Pending pickup", "Out for delivery", "Returned to branch", "Cancelled". */
export function ParcelStatusBadge({ delivery }: { delivery: Pick<CourierDelivery, "completed" | "task"> }) {
  const status = deliveryStatus(delivery);
  return <Badge tone={status.tone}>{status.label}</Badge>;
}

const TYPE_ICON = { PICKUP: PackagePlus, DELIVERY: Truck, TRANSFER: ArrowLeftRight } as const;

/**
 * The task type's icon in a tile: a parcel for pickups, a truck for deliveries, arrows for transfers. Pickups and
 * deliveries use the orange accent in a light orange tile: it marks the kind of work (decoration next to the visible
 * type label), never a parcel status, which stays in the status badge. A transfer isn't courier work: neutral grey.
 */
export function TaskTypeIcon({ type, className }: { type: AssignmentType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md",
        type === "TRANSFER" ? "bg-grey-50 text-grey-700" : "bg-orange-50 text-orange-700",
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}
