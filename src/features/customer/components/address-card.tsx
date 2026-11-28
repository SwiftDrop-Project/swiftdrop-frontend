"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/format";
import type { CustomerAddress } from "../types";

/**
 * One saved address: label (with "Default" on the default pickup address), contact, address, district and postal
 * code, mobile and landmark, with Make default / Edit / Delete. The actions sit beside the details from sm up and
 * below them on phones. The card being edited is outlined.
 */
export function AddressCard({
  address,
  districtName,
  editing,
  busy,
  onMakeDefault,
  onEdit,
  onDelete,
}: {
  address: CustomerAddress;
  districtName: string;
  editing: boolean;
  busy: boolean;
  onMakeDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={cn(editing && "border-orange-600")} aria-current={editing ? "true" : undefined}>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h3 font-semibold text-grey-900">{address.label}</h2>
            {address.isDefault ? (
              <Badge tone="neutral" dot={false}>
                Default
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-label text-grey-900">{address.contactName}</p>
          <address className="flex flex-col gap-1 text-body text-grey-700 not-italic">
            <span>
              {address.addressLine}, {address.city}
            </span>
            <span className="tabular-nums">
              {districtName} · {address.postalCode}
            </span>
            <span className="tabular-nums">{formatPhone(address.phone)}</span>
            {address.landmark ? <span>Landmark: {address.landmark}</span> : null}
          </address>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {address.isDefault ? null : (
            <Button variant="secondary" disabled={busy} onClick={onMakeDefault}>
              Make default
              <span className="sr-only"> ({address.label})</span>
            </Button>
          )}
          <Button variant="secondary" disabled={busy} onClick={onEdit} aria-pressed={editing}>
            Edit
            <span className="sr-only"> {address.label}</span>
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onDelete}>
            Delete
            <span className="sr-only"> {address.label}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
