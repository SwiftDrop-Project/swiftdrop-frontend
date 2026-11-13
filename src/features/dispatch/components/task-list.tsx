"use client";

import Link from "next/link";
import { ClipboardList, RotateCw } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
import { formatDate, formatPhone } from "@/lib/format";
import { dispatchApi } from "../api";
import { useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import { ASSIGNMENT_STATUSES, ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_TYPES, ASSIGNMENT_TYPE_LABEL } from "../labels";
import type { AssignmentStatus, AssignmentSummary, AssignmentType } from "../types";
import { BranchSelect } from "./branch-select";
import { AssignmentStatusBadge } from "./dispatch-badges";

const PAGE_SIZE = 20;

function subscribeToNothing() {
  return () => {};
}

function readCourierParam(): string {
  return new URLSearchParams(window.location.search).get("courierId") ?? "";
}

/** "Colombo → Kandy", "→ Colombo" (pickup) or "Galle →" (delivery). */
export function useRoute() {
  const { name } = useDistrictName();
  return React.useCallback(
    (task: Pick<AssignmentSummary, "type" | "originBranch" | "destinationBranch">) => {
      if (task.type === "PICKUP") return `Senders → ${name(task.destinationBranch)}`;
      if (task.type === "DELIVERY") return `${name(task.originBranch)} → recipients`;
      return `${name(task.originBranch)} → ${name(task.destinationBranch)}`;
    },
    [name],
  );
}

/** Every courier task with its parcels, newest first, filtered by branch, status, type and day. */
export function TaskList() {
  const courierParam = React.useSyncExternalStore(subscribeToNothing, readCourierParam, () => "");
  const [branch, setBranch] = React.useState("");
  const [status, setStatus] = React.useState<AssignmentStatus | "">("");
  const [type, setType] = React.useState<AssignmentType | "">("");
  const [date, setDate] = React.useState("");
  const [page, setPage] = React.useState(0);
  const route = useRoute();

  const params = {
    branch: branch || undefined,
    status: status || undefined,
    type: type || undefined,
    date: date || undefined,
    courierId: courierParam || undefined,
    page,
    size: PAGE_SIZE,
  };
  const tasks = useLoad(`tasks:${JSON.stringify(params)}`, (signal) => dispatchApi.listAssignments(params, signal));
  const hasFilters = Boolean(branch || status || type || date || courierParam);

  function filter<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(0);
    };
  }

  function clearFilters() {
    setBranch("");
    setStatus("");
    setType("");
    setDate("");
    setPage(0);
    // The courier filter comes from the link that opened the page (Couriers → "View tasks").
    if (courierParam) window.location.replace(window.location.pathname);
  }

  const content = tasks.data?.content ?? [];

  return (
    <ListPage
      title="Courier tasks"
      description="Every parcel moving through the branches, grouped in the tasks couriers are working on."
      action={
        <Button asChild>
          <Link href="/dispatcher/assign">Assign parcels</Link>
        </Button>
      }
      toolbar={
        <>
          <BranchSelect id="tasks-branch" value={branch} onChange={filter(setBranch)} allLabel="All branches" />
          <div className="w-full sm:w-44">
            <label htmlFor="tasks-status" className="sr-only">
              Status
            </label>
            <Select
              id="tasks-status"
              size="md"
              value={status}
              onChange={(event) => filter(setStatus)(event.target.value as AssignmentStatus | "")}
            >
              <option value="">All statuses</option>
              {ASSIGNMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {ASSIGNMENT_STATUS_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <label htmlFor="tasks-type" className="sr-only">
              Type
            </label>
            <Select
              id="tasks-type"
              size="md"
              value={type}
              onChange={(event) => filter(setType)(event.target.value as AssignmentType | "")}
            >
              <option value="">All types</option>
              {ASSIGNMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {ASSIGNMENT_TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <label htmlFor="tasks-date" className="sr-only">
              Day
            </label>
            <Input
              id="tasks-date"
              type="date"
              size="md"
              value={date}
              onChange={(event) => filter(setDate)(event.target.value)}
            />
          </div>
          {hasFilters ? (
            <Button variant="tertiary" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </>
      }
    >
      <Card aria-labelledby="tasks-heading">
        <CardHeader
          title={courierParam ? "Tasks for one courier" : "Tasks"}
          titleId="tasks-heading"
          description={
            tasks.status === "ready"
              ? `${tasks.data.totalElements} ${tasks.data.totalElements === 1 ? "task" : "tasks"}`
              : undefined
          }
        />
        {tasks.status === "error" ? (
          <div className="p-4 sm:p-6">
            <InlineNotice tone="error" title="We couldn't load the tasks">
              <p>{tasks.error}</p>
              <Button variant="secondary" className="mt-3" onClick={tasks.reload}>
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
            </InlineNotice>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-grey-100 md:hidden" aria-busy={tasks.status === "loading"}>
              {tasks.status === "ready" && content.length === 0 ? (
                <li className="p-4 text-body-sm text-grey-600">No tasks match these filters.</li>
              ) : null}
              {content.map((task) => (
                <li key={task.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/dispatcher/tasks/${task.id}`}
                      className="text-label font-semibold text-grey-900 hover:text-orange-700 hover:underline"
                    >
                      {ASSIGNMENT_TYPE_LABEL[task.type]} · {route(task)}
                    </Link>
                    <AssignmentStatusBadge status={task.status} />
                  </div>
                  <span className="text-body-sm text-grey-600">
                    {task.courier.fullName ?? "Unknown courier"} · {formatDate(task.scheduledFor)}
                  </span>
                  <span className="text-body-sm text-grey-900 tabular-nums">
                    {task.openParcelCount} of {task.parcelCount} parcels open
                  </span>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Parcels</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.status === "loading" ? (
                    <TableLoading columns={5} rows={4} label="Loading tasks" />
                  ) : content.length === 0 ? (
                    <TableEmpty
                      columns={5}
                      icon={ClipboardList}
                      title={hasFilters ? "No tasks match these filters" : "No courier tasks yet"}
                      description={
                        hasFilters
                          ? "Try another branch, status or day, or clear the filters."
                          : "Tasks you create from the unassigned parcels appear here."
                      }
                    />
                  ) : (
                    content.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Link
                            href={`/dispatcher/tasks/${task.id}`}
                            className="font-medium text-grey-900 hover:text-orange-700 hover:underline"
                          >
                            {ASSIGNMENT_TYPE_LABEL[task.type]}
                          </Link>
                          <span className="block text-caption text-grey-600">{route(task)}</span>
                        </TableCell>
                        <TableCell>
                          {task.courier.fullName ?? "Unknown courier"}
                          {task.courier.phone ? (
                            <span className="block text-caption text-grey-600 tabular-nums">
                              {formatPhone(task.courier.phone)}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDate(task.scheduledFor)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {task.openParcelCount} of {task.parcelCount} open
                        </TableCell>
                        <TableCell>
                          <AssignmentStatusBadge status={task.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {tasks.status === "ready" && tasks.data.totalPages > 1 ? (
              <div className="border-t border-grey-200 p-4">
                <Pagination
                  page={tasks.data.page}
                  totalPages={tasks.data.totalPages}
                  totalElements={tasks.data.totalElements}
                  size={tasks.data.size}
                  onPageChange={setPage}
                  itemLabel="tasks"
                />
              </div>
            ) : null}
          </>
        )}
      </Card>
    </ListPage>
  );
}
