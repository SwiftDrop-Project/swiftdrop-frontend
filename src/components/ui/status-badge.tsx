import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { ParcelStatus } from "@/types";

/** The words shown for each parcel status. Use these in filters and timelines too. */
export const PARCEL_STATUS_LABEL: Record<ParcelStatus, string> = {
  CREATED: "Pending pickup",
  PICKED_UP: "Picked up",
  AT_BRANCH: "At branch",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery failed",
};

const PARCEL_STATUS_TONE: Record<ParcelStatus, BadgeTone> = {
  CREATED: "outline",
  PICKED_UP: "neutral",
  AT_BRANCH: "neutral",
  IN_TRANSIT: "neutral",
  OUT_FOR_DELIVERY: "neutral",
  DELIVERED: "success",
  FAILED: "error",
};

/** Every parcel status, in life-cycle order. */
export const PARCEL_STATUSES = Object.keys(PARCEL_STATUS_LABEL) as ParcelStatus[];

/** Parcel status as dot + word (DESIGN.md §10). Never orange. */
export function StatusBadge({ status, className }: { status: ParcelStatus; className?: string }) {
  return (
    <Badge tone={PARCEL_STATUS_TONE[status]} className={className}>
      {PARCEL_STATUS_LABEL[status]}
    </Badge>
  );
}
