import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { LiveState, TrackingStatus } from "../types";

/** The parcel status badge, plus "At branch" (grey, in progress), which the shared StatusBadge doesn't have yet. */
export function TrackingStatusBadge({ status }: { status: TrackingStatus }) {
  if (status === "AT_BRANCH") return <Badge tone="neutral">At branch</Badge>;
  return <StatusBadge status={status} />;
}

/** Whether this screen updates by itself: dot + words, never orange. */
export function LiveIndicator({ state }: { state: LiveState | null }) {
  if (state === null) return null;
  if (state === "live") {
    return (
      <Badge tone="success" role="status">
        Live
      </Badge>
    );
  }
  return (
    <Badge tone="outline" role="status">
      {state === "connecting" ? "Connecting…" : "Updates every 30 seconds"}
    </Badge>
  );
}
