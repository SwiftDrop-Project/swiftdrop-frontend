import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { UserStatus } from "../types";

/** Every account status in plain words, with the same tones as the staff pages (StaffStatusBadge). */
export const ACCOUNT_STATUS_LABEL: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  DISABLED: { label: "Blocked", tone: "error" },
  PENDING_EMAIL_VERIFICATION: { label: "Email not confirmed", tone: "outline" },
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "outline" },
  PROFILE_INCOMPLETE: { label: "Profile not finished", tone: "outline" },
  REJECTED: { label: "Rejected", tone: "neutral" },
  REMOVED: { label: "Removed", tone: "neutral" },
};

export function AccountStatusBadge({ status }: { status: UserStatus }) {
  const { label, tone } = ACCOUNT_STATUS_LABEL[status];
  return <Badge tone={tone}>{label}</Badge>;
}
