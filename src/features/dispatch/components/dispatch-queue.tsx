"use client";

import { PackageOpen, RotateCw, Warehouse } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
import { formatDateTime, formatTrackingNumber } from "@/lib/format";
import { dispatchApi } from "../api";
import { useDispatchBranch, useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { ASSIGNMENT_TYPE_LABEL } from "../labels";
import type { QueueKind, QueueParcel } from "../types";
import { BranchSelect } from "./branch-select";
import { CreateTaskDialog } from "./create-task-dialog";
import { ParcelStatusBadge } from "./dispatch-badges";

/** Parcels that can share one task: same next step between the same branches. */
function legKey(parcel: QueueParcel): string {
  return `${parcel.suggestedType}:${parcel.suggestedOrigin ?? ""}:${parcel.suggestedDestination ?? ""}`;
}

/**
 * The dispatcher's queue at one branch: new parcels to collect, or parcels at the branch waiting for a transfer or
 * delivery. Select parcels with the same next step and create one courier task for them.
 */
export function DispatchQueue() {
  const [branch, setBranch] = useDispatchBranch();
  const [kind, setKind] = React.useState<QueueKind>("PICKUP");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { name } = useDistrictName();
  const queue = useLoad(`queue:${branch}:${kind}`, (signal) => dispatchApi.queue(branch, kind, signal));

  const rows = React.useMemo(() => queue.data ?? [], [queue.data]);
  const chosen = rows.filter((parcel) => selected.has(parcel.parcelId));
  const legs = new Set(chosen.map(legKey));
  const mixed = legs.size > 1;

  function changeBranch(code: string) {
    if (!code) return;
    setSelected(new Set());
    setBranch(code);
  }

  function changeKind(next: QueueKind) {
    setSelected(new Set());
    setKind(next);
  }

  function toggle(parcelId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(parcelId);
      else next.delete(parcelId);
      return next;
    });
  }

  /** Select every parcel with the same next step as the first selected one (or the first row). */
  function selectSameStep() {
    const anchor = chosen[0] ?? rows[0];
    if (!anchor) return;
    const key = legKey(anchor);
    setSelected(new Set(rows.filter((parcel) => legKey(parcel) === key).slice(0, 50).map((p) => p.parcelId)));
  }

  function nextStep(parcel: QueueParcel): string {
    const label = ASSIGNMENT_TYPE_LABEL[parcel.suggestedType];
    if (parcel.suggestedType === "TRANSFER") return `${label} to ${name(parcel.suggestedDestination)}`;
    if (parcel.suggestedType === "PICKUP") return `${label} to ${name(parcel.suggestedDestination)} branch`;
    return label;
  }

  const emptyTitle = kind === "PICKUP" ? "No parcels waiting for pickup" : "No parcels waiting at this branch";
  const emptyDescription =
    kind === "PICKUP"
      ? `New bookings from senders in ${name(branch)} appear here until a courier is assigned to collect them.`
      : `Parcels dropped at ${name(branch)} branch appear here until they're sent on or out for delivery.`;

  const createButton = (
    <Button
      onClick={() => setDialogOpen(true)}
      disabled={chosen.length === 0 || mixed || chosen.length > 50}
    >
      {chosen.length > 0 ? `Create task (${chosen.length})` : "Create task"}
    </Button>
  );

  return (
    <ListPage
      title="Unassigned parcels"
      description="Choose parcels with the same next step and give them to one courier as a task."
      action={createButton}
      toolbar={
        <>
          <BranchSelect id="queue-branch" value={branch} onChange={changeBranch} />
          <SegmentedControl
            name="queue-kind"
            legend="Show"
            className="w-full sm:w-80"
            value={kind}
            onChange={changeKind}
            options={[
              { value: "PICKUP", label: "Pickups", icon: PackageOpen },
              { value: "AT_BRANCH", label: "At branch", icon: Warehouse },
            ]}
          />
        </>
      }
    >
      {mixed ? (
        <InlineNotice title="These parcels need different steps">
          One task holds parcels with the same next step between the same branches. Select only one kind, or use
          &quot;Select same step&quot;.
        </InlineNotice>
      ) : null}
      {chosen.length > 50 ? (
        <InlineNotice tone="error" title="Too many parcels">
          A task can hold up to 50 parcels.
        </InlineNotice>
      ) : null}

      <Card aria-labelledby="queue-heading">
        <CardHeader
          title={kind === "PICKUP" ? `Pickups in ${name(branch)}` : `At ${name(branch)} branch`}
          titleId="queue-heading"
          description={
            queue.status === "ready"
              ? `${rows.length} ${rows.length === 1 ? "parcel" : "parcels"} waiting, oldest first`
              : undefined
          }
          aside={
            rows.length > 0 ? (
              <Button variant="secondary" onClick={selectSameStep}>
                Select same step
              </Button>
            ) : null
          }
        />

        {queue.status === "error" ? (
          <div className="p-4 sm:p-6">
            <InlineNotice tone="error" title="We couldn't load the queue">
              <p>{queue.error}</p>
              <Button variant="secondary" className="mt-3" onClick={queue.reload}>
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
            </InlineNotice>
          </div>
        ) : (
          <>
            {/* Phones: one card per parcel. */}
            <ul className="divide-y divide-grey-100 md:hidden" aria-busy={queue.status === "loading"}>
              {queue.status === "ready" && rows.length === 0 ? (
                <li className="p-4 text-body-sm text-grey-600">{emptyTitle}.</li>
              ) : null}
              {rows.map((parcel) => (
                <li key={parcel.parcelId} className="flex gap-3 p-4">
                  <Checkbox
                    checked={selected.has(parcel.parcelId)}
                    onCheckedChange={(checked) => toggle(parcel.parcelId, checked === true)}
                    aria-label={`Select ${formatTrackingNumber(parcel.trackingNumber)}`}
                    className="mt-0.5"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-label font-semibold text-grey-900 tabular-nums">
                      {formatTrackingNumber(parcel.trackingNumber)}
                    </span>
                    <span className="text-body-sm text-grey-600">
                      {parcel.from.city} → {parcel.to.city}, {name(parcel.to.district)}
                    </span>
                    <span className="text-body-sm text-grey-900">{nextStep(parcel)}</span>
                    <span className="text-caption text-grey-600">
                      Waiting since {formatDateTime(parcel.waitingSince)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <span className="sr-only">Select</span>
                    </TableHead>
                    <TableHead>Tracking number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Waiting since</TableHead>
                    <TableHead>Next step</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.status === "loading" ? (
                    <TableLoading columns={8} rows={4} label="Loading parcels" />
                  ) : rows.length === 0 ? (
                    <TableEmpty
                      columns={8}
                      icon={kind === "PICKUP" ? PackageOpen : Warehouse}
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  ) : (
                    rows.map((parcel) => (
                      <TableRow key={parcel.parcelId}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(parcel.parcelId)}
                            onCheckedChange={(checked) => toggle(parcel.parcelId, checked === true)}
                            aria-label={`Select ${formatTrackingNumber(parcel.trackingNumber)}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap tabular-nums">
                          {formatTrackingNumber(parcel.trackingNumber)}
                        </TableCell>
                        <TableCell>
                          <ParcelStatusBadge status={parcel.status} />
                        </TableCell>
                        <TableCell>
                          {parcel.from.city}
                          <span className="block text-caption text-grey-600">{name(parcel.from.district)}</span>
                        </TableCell>
                        <TableCell>
                          {parcel.to.city}
                          <span className="block text-caption text-grey-600">{name(parcel.to.district)}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{parcel.weightKg} kg</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDateTime(parcel.waitingSince)}
                        </TableCell>
                        <TableCell>{nextStep(parcel)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <CreateTaskDialog
        parcels={chosen}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        // The dialog opens the new task's page; clearing the selection here would empty the closing dialog.
        onCreated={() => {}}
      />
    </ListPage>
  );
}
