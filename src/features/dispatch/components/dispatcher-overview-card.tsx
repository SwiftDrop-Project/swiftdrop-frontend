"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { dispatchApi } from "../api";
import { useDispatchBranch, useDistrictName } from "../hooks/use-dispatch-branch";
import { useLoad } from "../hooks/use-load";
import type { DispatchOverview } from "../types";
import { BranchSelect } from "./branch-select";

interface Figure {
  key: keyof Omit<DispatchOverview, "branch">;
  label: string;
  href: string;
}

const FIGURES: Figure[] = [
  { key: "waitingPickup", label: "Waiting for pickup", href: "/dispatcher/assign" },
  { key: "waitingAtBranch", label: "Waiting at the branch", href: "/dispatcher/assign" },
  { key: "assignedTasks", label: "Tasks not started", href: "/dispatcher/parcels" },
  { key: "inProgressTasks", label: "Tasks in progress", href: "/dispatcher/parcels" },
  { key: "completedToday", label: "Tasks completed today", href: "/dispatcher/parcels" },
  { key: "issuesThisWeek", label: "Delivery issues this week", href: "/dispatcher/issues" },
  { key: "activeCouriers", label: "Active couriers", href: "/dispatcher/couriers" },
];

/** Today's figures for the dispatcher's branch, each linking to the page where they can act on it. */
export function DispatcherOverviewCard() {
  const [branch, setBranch] = useDispatchBranch();
  const { name } = useDistrictName();
  const overview = useLoad(`overview:${branch}`, (signal) => dispatchApi.overview(branch, signal));

  return (
    <Card aria-labelledby="dispatch-overview-heading">
      <CardHeader
        title={`Today at ${name(branch)} branch`}
        titleId="dispatch-overview-heading"
        description="Parcels waiting for a courier and the tasks under way."
        aside={
          <Button asChild>
            <Link href="/dispatcher/assign">Assign parcels</Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <BranchSelect id="overview-branch" value={branch} onChange={(code) => code && setBranch(code)} />

        {overview.status === "error" ? (
          <InlineNotice tone="error" title="We couldn't load today's figures">
            <p>{overview.error}</p>
            <Button variant="secondary" className="mt-3" onClick={overview.reload}>
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
          </InlineNotice>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy={overview.status === "loading"}>
            {FIGURES.map((figure) => (
              <Link
                key={figure.key}
                href={figure.href}
                className="flex flex-col gap-2 rounded-lg border border-grey-200 p-4 transition-colors hover:bg-grey-50"
              >
                <dt className="text-body-sm text-grey-600">{figure.label}</dt>
                <dd className="text-h1 text-grey-900 tabular-nums">
                  {overview.status === "ready" ? overview.data[figure.key] : <Skeleton className="h-8 w-12" />}
                </dd>
              </Link>
            ))}
          </dl>
        )}
      </div>
    </Card>
  );
}
