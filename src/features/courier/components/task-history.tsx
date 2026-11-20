"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { History, SearchX } from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import { HISTORY_PAGE_SIZE, historyHref, historyParams, taskHrefFromHistory } from "../lib/history";
import { courierRoutes } from "../lib/labels";
import { splitCourierTasks } from "../lib/task-view";
import type { CourierTaskPage } from "../types";
import { CourierLoadError } from "./courier-load-error";
import { TaskSummaryRow } from "./task-summary-row";

const DESCRIPTION = "Your completed and cancelled pickup and delivery tasks, newest first.";

/**
 * /courier/history: the courier's completed and cancelled tasks (GET /courier/assignments/history), newest first, 20
 * per page. `?q=` searches by tracking number (only the tasks that held that parcel), `?page=` pages (1-based).
 */
export function CourierTaskHistory() {
  const params = historyParams(useSearchParams());
  const { page, trackingNumber } = params;
  const loaded = useCourierLoad(`courier-history:${trackingNumber}:${page}`, (signal) =>
    courierApi.history({ page, size: HISTORY_PAGE_SIZE, trackingNumber: trackingNumber || undefined }, signal),
  );

  return (
    <ListPage
      title="Task history"
      description={DESCRIPTION}
      toolbar={<HistorySearch key={trackingNumber} trackingNumber={trackingNumber} />}
    >
      {loaded.status === "loading" ? (
        <HistoryLoading />
      ) : loaded.status === "error" ? (
        <Card className="p-4 sm:p-6">
          <CourierLoadError error={loaded.error} title="We couldn't load your task history" onRetry={loaded.reload} />
        </Card>
      ) : (
        <HistoryList history={loaded.data} trackingNumber={trackingNumber} refreshing={loaded.refreshing} />
      )}
    </ListPage>
  );
}

/** Search by tracking number. Searching starts again from the first page; "Clear" shows every task again. */
function HistorySearch({ trackingNumber }: { trackingNumber: string }) {
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("q") ?? "");
    router.push(historyHref({ trackingNumber: value }));
  }

  return (
    <form
      role="search"
      aria-label="Search task history"
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label htmlFor="history-tracking-number" className="text-label text-grey-900">
          Tracking number
        </label>
        <Input
          id="history-tracking-number"
          name="q"
          type="search"
          defaultValue={trackingNumber}
          placeholder="e.g. SD 2611 0048 17"
          autoComplete="off"
          aria-describedby="history-tracking-number-helper"
        />
        <p id="history-tracking-number-helper" className="sr-only">
          Shows only the tasks that held this parcel.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 sm:flex-none">
          Search
        </Button>
        {trackingNumber ? (
          <Button asChild variant="secondary" className="flex-1 sm:flex-none">
            <Link href={courierRoutes.history}>Clear</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** The page of tasks, or the right empty state (no tasks yet, no search results, a page past the end). */
export function HistoryList({
  history,
  trackingNumber,
  refreshing,
}: {
  history: CourierTaskPage;
  trackingNumber: string;
  refreshing: boolean;
}) {
  const districtName = useDistrictName();

  if (history.content.length === 0) {
    return (
      <Card className="p-6 sm:p-10">
        {trackingNumber ? (
          <EmptyState
            icon={SearchX}
            title="No tasks found for this tracking number"
            description={`None of your completed or cancelled tasks held ${trackingNumber}. Check the number, or clear the search.`}
            actions={
              <Button asChild variant="secondary">
                <Link href={courierRoutes.history}>Clear search</Link>
              </Button>
            }
          />
        ) : history.totalElements > 0 ? (
          // A page past the end (e.g. an old link): there are tasks, just not on this page.
          <EmptyState
            icon={History}
            title="This page is empty"
            description="There are no tasks on this page."
            actions={
              <Button asChild variant="secondary">
                <Link href={historyHref()}>Go to the first page</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={History}
            size="lg"
            title="No finished tasks yet"
            description="Tasks you complete, and tasks a dispatcher cancels, will appear here."
            actions={
              <Button asChild variant="secondary">
                <Link href={courierRoutes.today}>Go to today&apos;s tasks</Link>
              </Button>
            }
          />
        )}
      </Card>
    );
  }

  // Pickups and deliveries only. A branch transfer isn't courier work: it is counted, never shown as a task. The page
  // numbers stay the backend's.
  const { courier, other } = splitCourierTasks(history.content);

  return (
    <Card aria-label={trackingNumber ? `Tasks that held ${trackingNumber}` : "Completed and cancelled tasks"} aria-busy={refreshing}>
      {other.length > 0 ? (
        <InlineNotice className="m-4 sm:mx-6" title={`${other.length} branch ${other.length === 1 ? "transfer" : "transfers"} on this page not shown`}>
          Branch transfers aren&apos;t courier work, so they aren&apos;t listed here.
        </InlineNotice>
      ) : null}
      <ul className="divide-y divide-grey-100">
        {courier.map((task) => (
          <TaskSummaryRow
            key={task.assignmentId}
            task={task}
            districtName={districtName}
            href={taskHrefFromHistory(task.assignmentId)}
          />
        ))}
      </ul>
      <Pagination
        page={history.page}
        totalPages={history.totalPages}
        totalElements={history.totalElements}
        size={history.size}
        itemLabel="tasks"
        getHref={(target) => historyHref({ page: target, trackingNumber })}
      />
    </Card>
  );
}

export function HistoryLoading() {
  return (
    <Card aria-busy="true" aria-label="Loading your task history">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3 border-b border-grey-100 p-4 last:border-b-0 sm:px-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      ))}
    </Card>
  );
}
