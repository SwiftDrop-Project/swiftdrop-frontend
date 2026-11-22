"use client";

import { MapPinOff, RotateCw } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { formatRs } from "@/lib/format";
import type { DistrictCode } from "@/types";
import type { DistrictCentre } from "../admin-types";
import { useRouteTable } from "../hooks/use-admin-pricing";

const DEFAULT_FROM: DistrictCode = "COLOMBO";

/**
 * Distance and linehaul from one branch to every district. `districts` null (still loading) disables the branch
 * picker but still loads the table for the default branch.
 */
export function RouteTableCard({ districts }: { districts: DistrictCentre[] | null }) {
  const titleId = React.useId();
  const selectId = React.useId();
  const [from, setFrom] = React.useState<DistrictCode>(DEFAULT_FROM);
  const { state, retry } = useRouteTable(from);
  const table = state.status === "ready" ? state.data : null;

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Routes between branches"
        titleId={titleId}
        description={
          table
            ? `Road distance = straight line × ${table.roadFactor.toFixed(2)} · ${formatRs(table.linehaulPerKm)} a km`
            : "Distance and the between-branches charge from one branch"
        }
      />
      <div className="flex flex-col gap-2 border-b border-grey-200 px-4 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-6">
        <Label htmlFor={selectId}>From branch</Label>
        <div className="sm:w-64">
          <Select
            id={selectId}
            size="md"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            disabled={districts === null}
          >
            {districts === null ? (
              <option value={DEFAULT_FROM}>Colombo</option>
            ) : (
              districts.map((district) => (
                <option key={district.district} value={district.district}>
                  {district.name}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      {state.status === "error" ? (
        <div className="p-4 sm:p-6">
          <InlineNotice tone="error" title="We couldn't load the routes">
            <p>{state.message}</p>
            <Button variant="secondary" className="mt-3" onClick={retry}>
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
          </InlineNotice>
        </div>
      ) : (
        <Table>
          <TableCaption className="sr-only">
            {table ? `Distance and between-branches charge from ${table.fromName}` : "Routes between branches"}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Distance</TableHead>
              <TableHead className="text-right">Between branches</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table === null ? (
              <TableLoading columns={3} rows={8} label="Loading the routes" />
            ) : table.routes.length === 0 ? (
              <TableEmpty
                columns={3}
                icon={MapPinOff}
                title="No routes"
                description="No districts were returned for this branch."
              />
            ) : (
              table.routes.map((route) => (
                <TableRow key={route.to}>
                  <TableCell className="text-grey-900">
                    {route.toName}
                    {route.to === table.from ? (
                      <span className="ml-2 text-caption text-grey-500">Same branch</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {route.distanceKm === null ? "Not priced" : `${route.distanceKm.toFixed(1)} km`}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {route.linehaul === null ? "—" : formatRs(route.linehaul)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
