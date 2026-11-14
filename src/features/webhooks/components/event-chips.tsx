import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { WEBHOOK_EVENT_LABEL } from "../labels";
import type { WebhookEventType } from "../types";

/** At most this many chips per line: with all 7 events, 5 go on the first line and the other 2 on the next. */
const CHIPS_PER_LINE = 5;

/**
 * The events a webhook receives as chips, in the order of the event table. All of them are shown, at most
 * `perLine` per line (narrow screens wrap earlier on their own). Pass `max` only where space is really tight
 * (the rest then shows as "+2 more").
 */
export function EventChips({
  eventTypes,
  max,
  perLine = CHIPS_PER_LINE,
}: {
  eventTypes: WebhookEventType[];
  max?: number;
  perLine?: number;
}) {
  const shown = max === undefined ? eventTypes : eventTypes.slice(0, max);
  const hidden = eventTypes.length - shown.length;
  const all = eventTypes.map((type) => WEBHOOK_EVENT_LABEL[type]).join(", ");

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={`Events: ${all}`}>
      {shown.map((type, index) => (
        <React.Fragment key={type}>
          {/* a full-width, zero-height item starts a new line after every `perLine` chips */}
          {index > 0 && index % perLine === 0 ? <li aria-hidden="true" className="h-0 basis-full" /> : null}
          <li>
            <Badge tone="outline" dot={false}>
              {WEBHOOK_EVENT_LABEL[type]}
            </Badge>
          </li>
        </React.Fragment>
      ))}
      {hidden > 0 ? (
        <li title={all}>
          <Badge tone="neutral" dot={false}>
            +{hidden} more
          </Badge>
        </li>
      ) : null}
    </ul>
  );
}
