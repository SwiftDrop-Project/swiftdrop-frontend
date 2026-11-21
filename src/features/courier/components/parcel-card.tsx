import Link from "next/link";
import {
  Banknote,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRs, formatTime, formatTrackingNumber } from "@/lib/format";
import { ASSIGNMENT_TYPE_LABEL, courierRoutes, formatWeight } from "../lib/labels";
import type { ParcelAction } from "../lib/parcel-actions";
import { parcelPhase } from "../lib/parcel-status";
import {
  contactLabel,
  deliveryContact,
  assignedRoute,
  headingToContact,
  outcomeDetails,
  parcelNextStep,
} from "../lib/parcel-view";
import type { CourierDelivery } from "../types";
import { ContactActions, fullAddress } from "./contact-details";
import { CopyTrackingNumber } from "./copy-tracking-number";
import { ParcelActionButtons } from "./parcel-action-buttons";
import { ParcelStatusBadge, TaskTypeIcon } from "./task-badges";

/**
 * One parcel on today's dashboard (never a whole task): its type and courier status, the tracking number, where it
 * comes from and goes to, who to meet (only while the API sends the contact), cash to collect, what to do next, and
 * the actions the API allows for this parcel. Render it inside a <ul>.
 */
export function ParcelCard({
  delivery,
  districtName,
  busy = false,
  onAction,
}: {
  delivery: CourierDelivery;
  districtName: (code: string) => string;
  /** Another update is being saved or today's list is reloading. */
  busy?: boolean;
  onAction?: (delivery: CourierDelivery, action: ParcelAction) => void;
}) {
  const tracking = formatTrackingNumber(delivery.trackingNumber);
  const typeLabel = ASSIGNMENT_TYPE_LABEL[delivery.task.type];
  const phase = parcelPhase(delivery);
  const contact = deliveryContact(delivery);
  // Only when the API allows no status change now (the parcel isn't ready for this step): say why.
  const warning =
    phase === "active" && delivery.nextStatuses.length === 0 ? parcelNextStep(delivery, districtName) : null;
  const details = phase === "active" ? [] : outcomeDetails(delivery);
  // The courier's own leg: sender → branch for a pickup, branch → recipient for a delivery.
  const route = assignedRoute(delivery, districtName);
  const when =
    phase === "completed" && delivery.completedAt ? `Completed at ${formatTime(delivery.completedAt)}` : null;

  return (
    // Two rows shared with the other cards in the grid row (CSS subgrid): the body, then the action section. Each row
    // is as tall as the tallest card's, so cards have the same height and the action dividers, buttons and "View
    // parcel" line up across the row, whatever each parcel shows or allows. Outside a grid it is a plain two-row card.
    <li className="row-span-2 grid min-w-0 grid-rows-subgrid">
      <Card className="row-span-2 grid grid-rows-subgrid p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-start gap-3">
            <TaskTypeIcon type={delivery.task.type} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <div className="flex min-w-0 items-center gap-1">
                  <h3 className="min-w-0 break-words text-h3 text-grey-900 tabular-nums">{tracking}</h3>
                  <CopyTrackingNumber trackingNumber={delivery.trackingNumber} />
                </div>
                <ParcelStatusBadge delivery={delivery} />
              </div>
              <p className="text-body-sm text-grey-600 tabular-nums">
                {typeLabel} · {formatWeight(delivery.weightKg)}
                {when ? ` · ${when}` : ""}
              </p>
            </div>
          </div>

          <dl className="flex flex-col gap-2 text-body-sm">
            <div className="flex items-start gap-2">
              <CircleDot className="mt-0.5 size-4 shrink-0 text-grey-500" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-caption text-grey-600">From</dt>
                <dd className="break-words text-grey-900">{route.from}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-grey-500" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-caption text-grey-600">To</dt>
                <dd className="break-words text-grey-900">{route.to}</dd>
              </div>
            </div>
          </dl>

          {contact ? (
            <div className="flex flex-col gap-1 rounded-md border border-grey-200 p-3 text-body-sm">
              <p className="text-caption text-grey-600 uppercase">{contactLabel(delivery)}</p>
              <p className="break-words text-label text-grey-900">{contact.name}</p>
              <p className="break-words text-grey-700">{fullAddress(contact, districtName)}</p>
              {/* Call (number visible) and, when this contact is the next stop, Get directions. */}
              <ContactActions
                contact={contact}
                districtName={districtName}
                directions={headingToContact(delivery)}
                className="mt-2"
              />
            </div>
          ) : null}

          {phase === "active" && delivery.codAmount !== null && delivery.task.type === "DELIVERY" ? (
            <p className="flex items-center gap-2 rounded-md border border-grey-200 bg-grey-50 px-3 py-2 text-label text-grey-900 tabular-nums">
              <Banknote className="size-5 shrink-0 text-grey-700" aria-hidden="true" />
              Collect {formatRs(delivery.codAmount)} in cash
            </p>
          ) : null}

          {/*
            No instructions box and no routine next-step line on the card: the status badge, the route and the buttons
            already say what to do (both stay on the parcel page). Only a warning stays: why no step can be done now
            (e.g. the parcel hasn't reached the branch, so Unable to Collect is the only action).
          */}
          {warning ? (
            <p className="flex items-start gap-1.5 break-words text-body-sm text-grey-700">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-grey-500" aria-hidden="true" />
              <span className="min-w-0">{warning}</span>
            </p>
          ) : null}

          {details.length > 0 ? (
            <div className="flex items-start gap-2 text-body-sm text-grey-600">
              <OutcomeIcon delivery={delivery} />
              <ul className="flex min-w-0 flex-col gap-0.5">
                {details.map((line) => (
                  <li key={line} className="break-words">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/*
          The action section (second shared row) behind a thin divider: the parcel's actions (two side by side in equal
          columns, or one full width), then "View parcel" centred at the bottom. Same pattern for pickups and deliveries.
        */}
        <div className="flex min-w-0 flex-col gap-2 border-t border-grey-100 pt-4">
          {phase === "active" ? (
            <ParcelActionButtons
              delivery={delivery}
              busy={busy}
              onAction={onAction ? (action) => onAction(delivery, action) : undefined}
            />
          ) : null}
          <Button asChild variant="tertiary" className="mt-auto h-11 self-center">
            <Link
              href={courierRoutes.parcel(delivery.parcelId)}
              // Starts with the visible words, then tells the cards apart for screen readers.
              aria-label={`View parcel ${tracking}`}
            >
              View parcel
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Card>
    </li>
  );
}

/**
 * Next to a finished parcel's outcome lines: success green when the step went as hoped (handed over, delivered),
 * the error colour for an exception (returned after a failed delivery, Unable to Collect), grey when the dispatcher
 * closed it. Decoration only: the lines and the status badge say the same in words.
 */
function OutcomeIcon({ delivery }: { delivery: Pick<CourierDelivery, "completed" | "task"> }) {
  const outcome = delivery.task.outcome;
  if (delivery.completed && (outcome === "DELIVERED" || outcome === "HANDED_OVER")) {
    return <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />;
  }
  if (delivery.completed && (outcome === "RETURNED" || outcome === "NOT_COLLECTED" || outcome === "NOT_LOADED")) {
    return <CircleAlert className="mt-0.5 size-4 shrink-0 text-error" aria-hidden="true" />;
  }
  return <CircleDashed className="mt-0.5 size-4 shrink-0 text-grey-500" aria-hidden="true" />;
}
