import { Badge } from "@/components/ui/badge";
import { WEBHOOK_EVENT_LABEL } from "../labels";
import type { WebhookEventType } from "../types";

/** The events a webhook receives as chips: the first few, then "+2 more" (all of them are in the title). */
export function EventChips({ eventTypes, max = 3 }: { eventTypes: WebhookEventType[]; max?: number }) {
  const shown = eventTypes.slice(0, max);
  const hidden = eventTypes.length - shown.length;
  const all = eventTypes.map((type) => WEBHOOK_EVENT_LABEL[type]).join(", ");

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={`Events: ${all}`} title={all}>
      {shown.map((type) => (
        <li key={type}>
          <Badge tone="outline" dot={false}>
            {WEBHOOK_EVENT_LABEL[type]}
          </Badge>
        </li>
      ))}
      {hidden > 0 ? (
        <li>
          <Badge tone="neutral" dot={false}>
            +{hidden} more
          </Badge>
        </li>
      ) : null}
    </ul>
  );
}
