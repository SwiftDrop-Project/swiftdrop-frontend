"use client";

import { Bike, ChevronDown, ChevronUp, RotateCw } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { formatPhone } from "@/lib/format";
import { vehicleTypeLabel } from "@/lib/reference";
import { dispatchApi } from "../api";
import { useDispatchBranch, useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { BranchSelect } from "./branch-select";
import { CourierParcels } from "./courier-parcels";

/** Active couriers at a branch and how much work each has, least busy first; each opens to show its parcels. */
export function CourierWorkloadView() {
  const [branch, setBranch] = useDispatchBranch();
  const [open, setOpen] = React.useState<ReadonlySet<string>>(new Set());
  const toggle = (courierId: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(courierId)) next.delete(courierId);
      else next.add(courierId);
      return next;
    });
  const parcelsButton = (courierId: string, fullName: string) => {
    const expanded = open.has(courierId);
    return (
      <Button
        variant="secondary"
        aria-expanded={expanded}
        aria-controls={`courier-parcels-${courierId}`}
        onClick={() => toggle(courierId)}
      >
        {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        {expanded ? "Hide parcels" : "Show parcels"}
        <span className="sr-only"> for {fullName}</span>
      </Button>
    );
  };
  const { name } = useDistrictName();
  const couriers = useLoad(`workload:${branch}`, (signal) => dispatchApi.workload(branch, signal));
  const rows = couriers.data ?? [];

  return (
    <ListPage
      title="Couriers"
      description="Active couriers at the branch and the work they have, least busy first. Open a courier to see the parcels assigned to them."
      toolbar={<BranchSelect id="couriers-branch" value={branch} onChange={(code) => code && setBranch(code)} />}
    >
      <Card aria-labelledby="couriers-heading">
        <CardHeader
          title={`Couriers at ${name(branch)}`}
          titleId="couriers-heading"
          description={
            couriers.status === "ready"
              ? `${rows.length} active ${rows.length === 1 ? "courier" : "couriers"}`
              : undefined
          }
        />
        {couriers.status === "error" ? (
          <div className="p-4 sm:p-6">
            <InlineNotice tone="error" title="We couldn't load the couriers">
              <p>{couriers.error}</p>
              <Button variant="secondary" className="mt-3" onClick={couriers.reload}>
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
            </InlineNotice>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-grey-100 md:hidden" aria-busy={couriers.status === "loading"}>
              {couriers.status === "ready" && rows.length === 0 ? (
                <li className="p-4 text-body-sm text-grey-600">No active couriers at this branch.</li>
              ) : null}
              {rows.map((courier) => (
                <li key={courier.courierId} className="flex flex-col gap-1 p-4">
                  <span className="text-label font-semibold text-grey-900">{courier.fullName}</span>
                  <span className="text-body-sm text-grey-600 tabular-nums">
                    {formatPhone(courier.phone)}
                    {courier.vehicleType ? ` · ${vehicleTypeLabel(courier.vehicleType)}` : ""}
                  </span>
                  <span className="text-body-sm text-grey-900 tabular-nums">
                    {courier.openParcels} {courier.openParcels === 1 ? "parcel" : "parcels"} to handle
                  </span>
                  <div className="mt-2 w-fit">{parcelsButton(courier.courierId, courier.fullName)}</div>
                  {open.has(courier.courierId) ? (
                    <div id={`courier-parcels-${courier.courierId}`} className="mt-2">
                      <CourierParcels courierId={courier.courierId} courierName={courier.fullName} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Courier</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Parcels to handle</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Parcels</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {couriers.status === "loading" ? (
                    <TableLoading columns={4} rows={4} label="Loading couriers" />
                  ) : rows.length === 0 ? (
                    <TableEmpty
                      columns={4}
                      icon={Bike}
                      title="No active couriers at this branch"
                      description="Couriers an admin adds to this branch appear here. Blocked couriers can't be given parcels."
                    />
                  ) : (
                    rows.map((courier) => (
                      <React.Fragment key={courier.courierId}>
                        <TableRow>
                          <TableCell>
                            <span className="font-medium">{courier.fullName}</span>
                            <span className="block text-caption text-grey-600 tabular-nums">
                              {formatPhone(courier.phone)}
                            </span>
                          </TableCell>
                          <TableCell>{courier.vehicleType ? vehicleTypeLabel(courier.vehicleType) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{courier.openParcels}</TableCell>
                          <TableCell className="text-right">
                            {parcelsButton(courier.courierId, courier.fullName)}
                          </TableCell>
                        </TableRow>
                        {open.has(courier.courierId) ? (
                          <TableRow>
                            <TableCell colSpan={4} id={`courier-parcels-${courier.courierId}`} className="bg-grey-50">
                              <CourierParcels courierId={courier.courierId} courierName={courier.fullName} />
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </ListPage>
  );
}
