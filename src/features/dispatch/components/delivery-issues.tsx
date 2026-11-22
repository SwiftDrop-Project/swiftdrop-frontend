"use client";

import Link from "next/link";
import { CircleCheck, RotateCw } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Select } from "@/components/ui/select";
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
import { ASSIGNMENT_TYPE_LABEL, TASK_PROBLEM_LABEL, failureReasonLabel } from "../labels";
import type { DeliveryIssue } from "../types";
import { BranchSelect } from "./branch-select";
import { OutcomeBadge, ParcelStatusBadge } from "./dispatch-badges";

const PERIODS = [
  { days: 1, label: "Last 24 hours" },
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
];

function reason(issue: DeliveryIssue): string {
  if (issue.problem) return TASK_PROBLEM_LABEL[issue.problem];
  if (issue.failureReason) return failureReasonLabel(issue.failureReason);
  return "";
}

/** Parcels couriers couldn't collect, load or deliver, and whether they're waiting to be planned again. */
export function DeliveryIssues() {
  const [branch, setBranch] = useDispatchBranch();
  const [days, setDays] = React.useState(7);
  const { name } = useDistrictName();
  const issues = useLoad(`issues:${branch}:${days}`, (signal) => dispatchApi.issues(branch, days, signal));
  const rows = issues.data ?? [];
  const waiting = rows.filter((issue) => issue.backInQueue).length;

  return (
    <ListPage
      title="Delivery issues"
      description="Parcels couriers couldn't collect, load or deliver. Parcels back in the queue need a new task."
      action={
        waiting > 0 ? (
          <Button asChild>
            <Link href="/dispatcher/assign">Plan them again</Link>
          </Button>
        ) : undefined
      }
      toolbar={
        <>
          <BranchSelect id="issues-branch" value={branch} onChange={(code) => code && setBranch(code)} />
          <div className="w-full sm:w-44">
            <label htmlFor="issues-period" className="sr-only">
              Period
            </label>
            <Select
              id="issues-period"
              size="md"
              value={String(days)}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {PERIODS.map((period) => (
                <option key={period.days} value={period.days}>
                  {period.label}
                </option>
              ))}
            </Select>
          </div>
        </>
      }
    >
      <Card aria-labelledby="issues-heading">
        <CardHeader
          title={`Issues at ${name(branch)}`}
          titleId="issues-heading"
          description={
            issues.status === "ready"
              ? `${rows.length} ${rows.length === 1 ? "parcel" : "parcels"}, ${waiting} waiting for a new task`
              : undefined
          }
        />
        {issues.status === "error" ? (
          <div className="p-4 sm:p-6">
            <InlineNotice tone="error" title="We couldn't load the issues">
              <p>{issues.error}</p>
              <Button variant="secondary" className="mt-3" onClick={issues.reload}>
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
            </InlineNotice>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-grey-100 md:hidden" aria-busy={issues.status === "loading"}>
              {issues.status === "ready" && rows.length === 0 ? (
                <li className="p-4 text-body-sm text-grey-600">No delivery issues in this period.</li>
              ) : null}
              {rows.map((issue) => (
                <li key={`${issue.assignmentId}-${issue.parcelId}`} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-label font-semibold text-grey-900 tabular-nums">
                      {issue.trackingNumber ? formatTrackingNumber(issue.trackingNumber) : "Unknown parcel"}
                    </span>
                    <OutcomeBadge outcome={issue.outcome} />
                  </div>
                  <span className="text-body-sm text-grey-600">
                    {reason(issue)} · {issue.courier.fullName ?? "Unknown courier"} · {formatDateTime(issue.updatedAt)}
                  </span>
                  {issue.note ? <span className="text-body-sm text-grey-600">“{issue.note}”</span> : null}
                  <Link
                    href={`/dispatcher/tasks/${issue.assignmentId}`}
                    className="w-fit text-label text-orange-700 hover:text-orange-800 hover:underline"
                  >
                    View task
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking number</TableHead>
                    <TableHead>What happened</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Parcel now</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Task</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.status === "loading" ? (
                    <TableLoading columns={6} rows={3} label="Loading delivery issues" />
                  ) : rows.length === 0 ? (
                    <TableEmpty
                      columns={6}
                      icon={CircleCheck}
                      title="No delivery issues"
                      description="Parcels couriers couldn't collect, load or deliver in this period appear here."
                    />
                  ) : (
                    rows.map((issue) => (
                      <TableRow key={`${issue.assignmentId}-${issue.parcelId}`}>
                        <TableCell className="font-medium whitespace-nowrap tabular-nums">
                          {issue.trackingNumber ? formatTrackingNumber(issue.trackingNumber) : "Unknown parcel"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <OutcomeBadge outcome={issue.outcome} />
                            <span className="text-caption text-grey-600">
                              {reason(issue)} ({ASSIGNMENT_TYPE_LABEL[issue.assignmentType].toLowerCase()})
                            </span>
                            {issue.note ? <span className="text-caption text-grey-600">“{issue.note}”</span> : null}
                          </div>
                        </TableCell>
                        <TableCell>{issue.courier.fullName ?? "Unknown courier"}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDateTime(issue.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {issue.parcelStatus ? <ParcelStatusBadge status={issue.parcelStatus} /> : null}
                            {issue.backInQueue ? (
                              <Badge tone="outline">Needs a new task</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="secondary">
                            <Link href={`/dispatcher/tasks/${issue.assignmentId}`}>View task</Link>
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
