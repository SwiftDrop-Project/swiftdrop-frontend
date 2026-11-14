"use client";

import { Radio, RotateCw } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { BranchSelect, useDispatchBranch, useDistrictName } from "@/features/dispatch";
import { formatTime, formatTrackingNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DistrictCode } from "@/types";
import { useLiveBoard } from "../hooks/use-live-board";
import { actorLabel, failureReasonLabel, trackingStatusLabel } from "../labels";
import type { LiveEvent } from "../types";
import { LiveIndicator, TrackingStatusBadge } from "./tracking-badges";
import { TrackingResult } from "./tracking-result";
import { TrackingSearchForm } from "./tracking-search-form";

/**
 * /dispatcher/tracking: every parcel status change as it happens (WebSocket /topic/live), for a branch or all of them,
 * and any parcel's journey, updated live, beside it.
 */
export function LiveBoard() {
  const [savedBranch] = useDispatchBranch();
  const [chosenBranch, setChosenBranch] = React.useState<DistrictCode | "" | null>(null);
  const branch = chosenBranch ?? savedBranch;
  const [selected, setSelected] = React.useState<string | null>(null);
  const { name } = useDistrictName();
  const board = useLiveBoard(branch);

  function route(event: LiveEvent): string {
    const from = event.origin ? name(event.origin) : "?";
    const to = event.destination ? name(event.destination) : "?";
    return `${from} → ${to}`;
  }

  function detail(event: LiveEvent): string {
    const parts: string[] = [];
    if (event.fromStatus) parts.push(`was ${trackingStatusLabel(event.fromStatus).toLowerCase()}`);
    if (event.toStatus === "AT_BRANCH" && event.branch) parts.push(`at ${name(event.branch)}`);
    if (event.failureReason) parts.push(failureReasonLabel(event.failureReason).toLowerCase());
    return parts.join(", ");
  }

  function trackingButton(event: LiveEvent) {
    return (
      <Button
        variant="link"
        className="h-auto p-0 font-medium tabular-nums"
        onClick={() => setSelected(event.trackingNumber)}
        aria-label={`Show the journey of ${formatTrackingNumber(event.trackingNumber)}`}
      >
        {formatTrackingNumber(event.trackingNumber)}
      </Button>
    );
  }

  return (
    <ListPage
      title="Live tracking"
      description="Parcel status changes as they happen. Select a tracking number to follow that parcel."
      toolbar={
        <>
          <BranchSelect
            id="live-branch"
            value={branch}
            onChange={(code) => setChosenBranch(code)}
            allLabel="All branches"
          />
          <div className="flex items-center">
            <LiveIndicator state={board.connected ? "live" : "connecting"} />
          </div>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card aria-labelledby="live-heading">
          <CardHeader
            title={branch ? `Latest changes for ${name(branch)}` : "Latest changes at every branch"}
            titleId="live-heading"
            description="Parcels that start, end or arrive at the branch. New changes appear at the top."
          />
          {board.status === "error" ? (
            <div className="p-4 sm:p-6">
              <InlineNotice tone="error" title="We couldn't load the latest changes">
                <p>{board.error}</p>
                <Button variant="secondary" className="mt-3" onClick={board.retry}>
                  <RotateCw aria-hidden="true" />
                  Try again
                </Button>
              </InlineNotice>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-grey-100 md:hidden" aria-busy={board.status === "loading"} aria-live="polite">
                {board.status === "ready" && board.events.length === 0 ? (
                  <li className="p-4 text-body-sm text-grey-600">No changes yet. They appear here as they happen.</li>
                ) : null}
                {board.events.map((event) => (
                  <li
                    key={event.eventId}
                    className={cn("flex flex-col gap-1 p-4", board.fresh.has(event.eventId) && "bg-grey-50")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {trackingButton(event)}
                      <TrackingStatusBadge status={event.toStatus} />
                    </div>
                    <span className="text-body-sm text-grey-600">
                      {route(event)} · {formatTime(event.occurredAt)} · {actorLabel(event.actorRole)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Tracking number</TableHead>
                      <TableHead>Now</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody aria-live="polite">
                    {board.status === "loading" ? (
                      <TableLoading columns={5} rows={4} label="Loading the latest changes" />
                    ) : board.events.length === 0 ? (
                      <TableEmpty
                        columns={5}
                        icon={Radio}
                        title="No changes yet"
                        description="Parcel status changes appear here as couriers and branches update them."
                      />
                    ) : (
                      board.events.map((event) => (
                        <TableRow key={event.eventId} className={cn(board.fresh.has(event.eventId) && "bg-grey-50")}>
                          <TableCell className="whitespace-nowrap tabular-nums">{formatTime(event.occurredAt)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {trackingButton(event)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <TrackingStatusBadge status={event.toStatus} />
                              {detail(event) ? (
                                <span className="text-caption text-grey-600">{detail(event)}</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{route(event)}</TableCell>
                          <TableCell>{actorLabel(event.actorRole)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card aria-labelledby="follow-heading">
            <CardHeader title="Follow a parcel" titleId="follow-heading" />
            <CardContent>
              <TrackingSearchForm
                id="live-tracking-number"
                key={selected ?? ""}
                defaultValue={selected ?? ""}
                onSearch={setSelected}
                submitLabel="Show"
              />
            </CardContent>
          </Card>
          {selected ? <TrackingResult key={selected} trackingNumber={selected} /> : null}
        </div>
      </div>
    </ListPage>
  );
}
