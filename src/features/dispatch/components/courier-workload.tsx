"use client";

import Link from "next/link";
import { Bike, RotateCw } from "lucide-react";
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

/** Active couriers at a branch and how much work each has, least busy first. */
export function CourierWorkloadView() {
  const [branch, setBranch] = useDispatchBranch();
  const { name } = useDistrictName();
  const couriers = useLoad(`workload:${branch}`, (signal) => dispatchApi.workload(branch, signal));
  const rows = couriers.data ?? [];

  return (
    <ListPage
      title="Couriers"
      description="Active couriers at the branch and the work they have, least busy first."
      toolbar={<BranchSelect id="couriers-branch" value={branch} onChange={(code) => code && setBranch(code)} />}
    >
      <Card aria-labelledby="couriers-heading">
        <CardHeader
          title={`Couriers at ${name(branch)}`}
          titleId="couriers-heading"
          description={
            couriers.status === "ready" ? `${rows.length} active ${rows.length === 1 ? "courier" : "couriers"}` : undefined
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
                    {courier.openTasks} open tasks · {courier.openParcels} parcels · {courier.completedToday} done
                    today
                  </span>
                  <Link
                    href={`/dispatcher/parcels?courierId=${courier.courierId}`}
                    className="w-fit text-label text-orange-700 hover:text-orange-800 hover:underline"
                  >
                    View tasks
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Courier</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Open tasks</TableHead>
                    <TableHead className="text-right">Open parcels</TableHead>
                    <TableHead className="text-right">Done today</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Tasks</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {couriers.status === "loading" ? (
                    <TableLoading columns={6} rows={4} label="Loading couriers" />
                  ) : rows.length === 0 ? (
                    <TableEmpty
                      columns={6}
                      icon={Bike}
                      title="No active couriers at this branch"
                      description="Couriers an admin adds to this branch appear here. Blocked couriers can't take tasks."
                    />
                  ) : (
                    rows.map((courier) => (
                      <TableRow key={courier.courierId}>
                        <TableCell>
                          <span className="font-medium">{courier.fullName}</span>
                          <span className="block text-caption text-grey-600 tabular-nums">
                            {formatPhone(courier.phone)}
                          </span>
                        </TableCell>
                        <TableCell>{courier.vehicleType ? vehicleTypeLabel(courier.vehicleType) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{courier.openTasks}</TableCell>
                        <TableCell className="text-right tabular-nums">{courier.openParcels}</TableCell>
                        <TableCell className="text-right tabular-nums">{courier.completedToday}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="secondary">
                            <Link href={`/dispatcher/parcels?courierId=${courier.courierId}`}>View tasks</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
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
