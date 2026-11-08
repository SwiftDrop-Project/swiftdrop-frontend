import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRs, formatTime, formatTrackingNumber } from "@/lib/format";
import { courierRoutes, isFinished, STOP_LABEL } from "../lib/labels";
import type { CourierDelivery } from "../types";
import { cityAndDistrict, PhoneLink } from "./contact-details";

/**
 * One parcel in "Today's deliveries": tracking number, status, where to go next (the pickup contact while
 * CREATED, otherwise the recipient), cash to collect, and "Open". Render it inside a <ul>.
 */
export function CourierDeliveryCard({
  parcel,
  districtName,
}: {
  parcel: CourierDelivery;
  districtName: (code: string) => string;
}) {
  const contact = parcel.stop === "PICKUP" ? parcel.pickup : parcel.recipient;
  const finished = isFinished(parcel.status);
  const tracking = formatTrackingNumber(parcel.trackingNumber);

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-label text-grey-900 tabular-nums">{tracking}</p>
          <StatusBadge status={parcel.status} />
          {finished ? null : (
            <Badge tone="neutral" dot={false}>
              {STOP_LABEL[parcel.stop]}
            </Badge>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1 text-body-sm">
          <p className="break-words text-grey-900">
            {parcel.stop === "PICKUP" ? "Collect from " : "Deliver to "}
            <span className="font-semibold">{contact.name}</span>
          </p>
          <p className="break-words text-grey-600">
            {contact.address}, {cityAndDistrict(contact, districtName)}
          </p>
          {finished ? null : (
            <p>
              <PhoneLink phone={contact.phone} />
            </p>
          )}
        </div>

        {!finished && parcel.stop === "DELIVERY" && parcel.codAmount !== null ? (
          <p className="text-label text-grey-900 tabular-nums">Collect {formatRs(parcel.codAmount)} in cash</p>
        ) : null}

        {finished ? (
          <p className="text-body-sm text-grey-600 tabular-nums">Finished at {formatTime(parcel.updatedAt)}</p>
        ) : null}
      </div>

      <Button asChild variant="secondary" className="w-full sm:w-auto">
        <Link href={courierRoutes.parcel(parcel.parcelId)} aria-label={`Open ${tracking}`}>
          Open
        </Link>
      </Button>
    </li>
  );
}
