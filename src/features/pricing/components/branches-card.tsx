import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import type { DistrictCentre } from "../admin-types";

/** "6.92710" style: the centres have five decimals. */
function coordinate(value: number | null): string {
  return value === null ? "—" : value.toFixed(5);
}

/** The 25 branches (one per district) and the centre each one's distances are measured from. */
export function BranchesCard({ districts }: { districts: DistrictCentre[] | null }) {
  const titleId = React.useId();
  const priced = districts?.filter((district) => district.priced).length ?? 0;

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader
        title="Branches"
        titleId={titleId}
        description="One branch per district. Distances are measured between the district centres."
        aside={
          districts ? (
            <span className="text-body-sm text-grey-600 tabular-nums">
              {priced} of {districts.length} priced
            </span>
          ) : null
        }
      />
      <Table>
        <TableCaption className="sr-only">Branches and their district centres</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>District</TableHead>
            <TableHead className="text-right">Latitude</TableHead>
            <TableHead className="text-right">Longitude</TableHead>
            <TableHead>Pricing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {districts === null ? (
            <TableLoading columns={4} rows={8} label="Loading the branches" />
          ) : (
            districts.map((district) => (
              <TableRow key={district.district}>
                <TableCell className="text-label text-grey-900">{district.name}</TableCell>
                <TableCell className="text-right tabular-nums text-grey-700">{coordinate(district.latitude)}</TableCell>
                <TableCell className="text-right tabular-nums text-grey-700">{coordinate(district.longitude)}</TableCell>
                <TableCell>
                  {district.priced ? (
                    <Badge tone="neutral">Priced</Badge>
                  ) : (
                    <Badge tone="outline">No centre</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
