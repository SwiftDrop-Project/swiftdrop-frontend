import { Badge } from "@/components/ui/badge";

/** Whether a webhook receives new parcel events: green "Active" or outlined "Off" (never orange). */
export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="success">Active</Badge> : <Badge tone="outline">Off</Badge>;
}
