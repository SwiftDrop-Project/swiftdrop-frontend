import { Badge } from "@/components/ui/badge";
import { humanizeCode } from "@/lib/format";
import type { UserStatus } from "../types";

export function StaffStatusBadge({
  status,
  mustChangePassword,
}: {
  status: UserStatus;
  mustChangePassword?: boolean;
}) {
  const statusBadge =
    status === "ACTIVE" ? (
      <Badge tone="success">Active</Badge>
    ) : status === "DISABLED" ? (
      <Badge tone="error">Blocked</Badge>
    ) : status === "REMOVED" ? (
      <Badge tone="neutral">Removed</Badge>
    ) : (
      <Badge tone="outline">{humanizeCode(status)}</Badge>
    );

  if (!mustChangePassword || status === "REMOVED") {
    return statusBadge;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {statusBadge}
      <Badge tone="outline">Password change pending</Badge>
    </div>
  );
}

