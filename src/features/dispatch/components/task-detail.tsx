"use client";

import { RotateCw, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { formatDate, formatDateTime, formatPhone, formatTrackingNumber } from "@/lib/format";
import { dispatchApi } from "../api";
import { useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { ASSIGNMENT_TYPE_LABEL, TASK_PROBLEM_LABEL, failureReasonLabel } from "../labels";
import type { AssignmentDetail, AssignmentItem } from "../types";
import { AssignmentStatusBadge, OutcomeBadge, ParcelStatusBadge } from "./dispatch-badges";
import { AddParcelsDialog, CancelTaskDialog, ReassignDialog } from "./task-dialogs";
import { useRoute } from "./task-list";

const BACK = { backHref: "/dispatcher/parcels", backLabel: "Back to courier tasks" };

/** One courier task: who does it, where, and what happened to each parcel; change it while it's open. */
export function TaskDetail({ id: idProp }: { id?: string }) {
  const params = useParams<{ id?: string }>();
  const id = idProp ?? params.id ?? "";
  const loaded = useLoad(`task:${id}`, (signal) => dispatchApi.getAssignment(id, signal));
  // The latest task after a change, so the page updates without loading again.
  const [changed, setChanged] = React.useState<AssignmentDetail | null>(null);
  const task = changed && changed.id === id && loaded.status === "ready" && changed.version >= loaded.data.version
    ? changed
    : loaded.data;

  if (loaded.status === "loading") {
    return (
      <DetailPage title="Courier task" {...BACK}>
        <Card className="p-6" aria-busy="true" aria-label="Loading task">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </Card>
      </DetailPage>
    );
  }

  if (loaded.status === "error" || !task) {
    return (
      <DetailPage title="Courier task" {...BACK}>
        <InlineNotice tone="error" title="We couldn't load this task">
          <p>{loaded.error}</p>
          <Button variant="secondary" className="mt-3" onClick={loaded.reload}>
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        </InlineNotice>
      </DetailPage>
    );
  }

  return <TaskDetailReady task={task} onChanged={setChanged} onReload={loaded.reload} />;
}

function TaskDetailReady({
  task,
  onChanged,
  onReload,
}: {
  task: AssignmentDetail;
  onChanged: (task: AssignmentDetail) => void;
  onReload: () => void;
}) {
  const { name } = useDistrictName();
  const route = useRoute();
  const [dialog, setDialog] = React.useState<"add" | "reassign" | "cancel" | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);

  const open = task.status === "ASSIGNED" || task.status === "IN_PROGRESS";
  const notStarted = task.status === "ASSIGNED";

  async function remove(item: AssignmentItem) {
    setRemoving(item.parcelId);
    try {
      const updated = await dispatchApi.removeParcel(task.id, item.parcelId);
      onChanged(updated);
      toast({
        tone: "info",
        title: "Parcel taken out of the task",
        description: "It's back in the unassigned parcels.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "We couldn't take the parcel out",
        description: isApiError(error) ? error.message : "Try again in a moment.",
      });
      onReload();
    } finally {
      setRemoving(null);
    }
  }

  function done(message: string) {
    return (updated: AssignmentDetail) => {
      onChanged(updated);
      toast({ tone: "success", title: message });
    };
  }

  const actions = open ? (
    <>
      {notStarted ? (
        <>
          <Button variant="secondary" onClick={() => setDialog("cancel")}>
            Cancel task
          </Button>
          <Button variant="secondary" onClick={() => setDialog("reassign")}>
            Change courier
          </Button>
        </>
      ) : null}
      <Button onClick={() => setDialog("add")} disabled={task.items.length >= 50}>
        Add parcels
      </Button>
    </>
  ) : undefined;

  const aside = (
    <Card aria-labelledby="task-summary-heading">
      <CardHeader title="Task details" titleId="task-summary-heading" />
      <CardContent>
        <dl className="flex flex-col gap-4 text-body-sm">
          <Detail label="Courier">
            {task.courier.fullName ?? "Unknown courier"}
            {task.courier.phone ? (
              <span className="block text-grey-600 tabular-nums">{formatPhone(task.courier.phone)}</span>
            ) : null}
          </Detail>
          <Detail label="Route">{route(task)}</Detail>
          <Detail label="Day">{formatDate(task.scheduledFor)}</Detail>
          <Detail label="Created">{formatDateTime(task.createdAt)}</Detail>
          {task.startedAt ? <Detail label="Started">{formatDateTime(task.startedAt)}</Detail> : null}
          {task.completedAt ? <Detail label="Completed">{formatDateTime(task.completedAt)}</Detail> : null}
          {task.cancelledAt ? <Detail label="Cancelled">{formatDateTime(task.cancelledAt)}</Detail> : null}
          {task.note ? <Detail label="Note to the courier">{task.note}</Detail> : null}
        </dl>
      </CardContent>
    </Card>
  );

  return (
    <DetailPage
      title={`${ASSIGNMENT_TYPE_LABEL[task.type]} task`}
      description={
        task.type === "TRANSFER"
          ? `${name(task.originBranch)} branch to ${name(task.destinationBranch)} branch`
          : task.type === "PICKUP"
            ? `Collect from senders, hand over at ${name(task.destinationBranch)} branch`
            : `Deliver from ${name(task.originBranch)} branch`
      }
      status={<AssignmentStatusBadge status={task.status} />}
      actions={actions}
      aside={aside}
      {...BACK}
    >
      {task.status === "IN_PROGRESS" ? (
        <InlineNotice title="The courier has started this task" className="mb-6">
          You can still add parcels, and take out ones the courier hasn&apos;t updated.
        </InlineNotice>
      ) : null}

      <Card aria-labelledby="task-parcels-heading">
        <CardHeader
          title="Parcels"
          titleId="task-parcels-heading"
          description={`${task.items.filter((item) => !item.closedAt).length} of ${task.items.length} still open`}
        />
        <ul className="divide-y divide-grey-100 md:hidden">
          {task.items.map((item) => (
            <li key={item.parcelId} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-label font-semibold text-grey-900 tabular-nums">
                  {item.sequence}. {item.trackingNumber ? formatTrackingNumber(item.trackingNumber) : "Unknown parcel"}
                </span>
                <OutcomeBadge outcome={item.outcome} />
              </div>
              {item.from && item.to ? (
                <span className="text-body-sm text-grey-600">
                  {item.from.city} → {item.to.city}
                </span>
              ) : null}
              <OutcomeDetails item={item} />
              {open && item.outcome === "PENDING" && task.items.length > 1 ? (
                <Button
                  variant="secondary"
                  className="w-fit"
                  loading={removing === item.parcelId}
                  onClick={() => void remove(item)}
                >
                  Take out of task
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Tracking number</TableHead>
                <TableHead>Parcel</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>In this task</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {task.items.map((item) => (
                <TableRow key={item.parcelId}>
                  <TableCell className="tabular-nums">{item.sequence}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap tabular-nums">
                    {item.trackingNumber ? formatTrackingNumber(item.trackingNumber) : "Unknown parcel"}
                  </TableCell>
                  <TableCell>{item.parcelStatus ? <ParcelStatusBadge status={item.parcelStatus} /> : "—"}</TableCell>
                  <TableCell>
                    {item.from && item.to ? (
                      <>
                        {item.from.city} → {item.to.city}
                        <span className="block text-caption text-grey-600">
                          {name(item.from.district)} → {name(item.to.district)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <OutcomeBadge outcome={item.outcome} />
                      <OutcomeDetails item={item} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {open && item.outcome === "PENDING" && task.items.length > 1 ? (
                      <IconButton
                        label={`Take ${item.trackingNumber ? formatTrackingNumber(item.trackingNumber) : "parcel"} out of the task`}
                        disabled={removing !== null}
                        onClick={() => void remove(item)}
                      >
                        <Trash2 />
                      </IconButton>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AddParcelsDialog
        task={task}
        open={dialog === "add"}
        onOpenChange={(next) => setDialog(next ? "add" : null)}
        onDone={done("Parcels added to the task")}
      />
      <ReassignDialog
        task={task}
        open={dialog === "reassign"}
        onOpenChange={(next) => setDialog(next ? "reassign" : null)}
        onDone={done("Courier changed")}
      />
      <CancelTaskDialog
        task={task}
        open={dialog === "cancel"}
        onOpenChange={(next) => setDialog(next ? "cancel" : null)}
        onDone={done("Task cancelled. Its parcels are back in the unassigned parcels.")}
      />
    </DetailPage>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-grey-600 uppercase">{label}</dt>
      <dd className="text-grey-900">{children}</dd>
    </div>
  );
}

/** Why a parcel wasn't taken or delivered, who received it, and the courier's note. */
function OutcomeDetails({ item }: { item: AssignmentItem }) {
  const lines: string[] = [];
  if (item.problem) lines.push(TASK_PROBLEM_LABEL[item.problem]);
  if (item.failureReason) lines.push(failureReasonLabel(item.failureReason));
  if (item.recipientName) lines.push(`Received by ${item.recipientName}`);
  if (item.receivedBy) lines.push(`Handed to ${item.receivedBy} at the branch`);
  if (item.note) lines.push(`“${item.note}”`);
  if (lines.length === 0) return null;
  return (
    <span className="text-caption text-grey-600">
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </span>
  );
}
