"use client";

import Link from "next/link";
import { CircleCheck, ClipboardList, ListTodo, PackagePlus, Truck } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { courierApi } from "../api";
import { useCourierLoad } from "../hooks/use-courier-load";
import { useDistrictName } from "../hooks/use-district-name";
import { courierRoutes } from "../lib/labels";
import type { ActionFailure } from "../lib/parcel-actions";
import { applyParcelUpdate, deliveryKey, groupToday, parcelsText } from "../lib/parcel-view";
import type { CourierDelivery, CourierDeliveryDetail } from "../types";
import { CourierLoadError } from "./courier-load-error";
import { ParcelActionDialog, type ParcelActionTarget } from "./parcel-action-dialog";
import { ParcelCard } from "./parcel-card";

/**
 * /courier: GET /courier/deliveries/today as one card per parcel (never one per task), in two tabs:
 * - Active: pickups, then deliveries, in the API's order, each with the actions the API allows for that parcel
 * - Completed today: the parcels the backend marked `completed` today, newest first
 * Courier work is pickups and deliveries only: a branch transfer the API sends anyway is counted in a notice, never
 * shown as a card or counted as work.
 * A parcel moves to Completed as soon as its own step completes it (handed over, delivered, returned, Unable to
 * Collect); its sibling parcels in the same dispatch task stay active until they are done. There is no "complete
 * task" button: the backend completes the task by itself.
 */
export function CourierTodayParcels() {
  const loaded = useCourierLoad("courier-today", (signal) => courierApi.today(signal));
  const districtName = useDistrictName();
  const [target, setTarget] = React.useState<ParcelActionTarget | null>(null);
  const [saving, setSaving] = React.useState(false);

  if (loaded.status === "loading") return <TodayLoading />;

  if (loaded.status === "error") {
    return (
      <Card className="p-4 sm:p-6">
        <CourierLoadError error={loaded.error} title="We couldn't load your parcels" onRetry={loaded.reload} />
      </Card>
    );
  }

  const today = loaded.data;
  const groups = groupToday(today.items);
  const activeCount = groups.pickups.length + groups.deliveries.length;
  // Pickups and deliveries only: a branch transfer is never courier work.
  const courierWorkCount = activeCount + groups.completed.length + groups.closed.length;
  // While a form is open, saving or the list is reloading, every other parcel's buttons wait.
  const busy = loaded.refreshing || saving || target !== null;

  function saved(updated: CourierDeliveryDetail, message: string) {
    toast({ tone: "success", title: message });
    // Show the parcel as the API answered now (only this parcel changes), then load today again in the background.
    loaded.refresh(applyParcelUpdate(today, updated));
  }

  function failed(failure: Extract<ActionFailure, { kind: "reload" | "gone" }>) {
    // Nothing was saved: show today's parcels as they are now, so the courier can look again.
    toast({ tone: "error", title: failure.title, description: `${failure.message} We've loaded the latest version.` });
    loaded.reload();
  }

  const onAction = (delivery: CourierDelivery, action: ParcelActionTarget["action"]) => setTarget({ delivery, action });

  const section = (id: string, title: string, description: string, items: CourierDelivery[]) =>
    items.length === 0 ? null : (
      <section aria-labelledby={id} className="@container flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={id} className="text-h3 text-grey-900">
              {title}
            </h2>
            <p className="text-body-sm text-grey-600">{description}</p>
          </div>
          <p className="shrink-0 text-label text-grey-600 tabular-nums">{parcelsText(items.length)}</p>
        </div>
        <ul className={PARCEL_GRID} aria-busy={loaded.refreshing}>
          {items.map((delivery) => (
            <ParcelCard
              key={deliveryKey(delivery)}
              delivery={delivery}
              districtName={districtName}
              busy={busy}
              onAction={onAction}
            />
          ))}
        </ul>
      </section>
    );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-body-sm text-grey-600 tabular-nums">{formatDate(today.date)}</p>
        {/*
          Counted from the parcels shown, one per parcel (never per task): pickups include parcels waiting to be
          handed over, deliveries include failed ones waiting to be returned; completed parcels are never "to do".
          (The API's toDo/done would also count a branch transfer.)
        */}
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Today at a glance">
          <Stat icon={ListTodo} label="To do" value={activeCount} />
          <Stat icon={PackagePlus} label="Pickups to do" value={groups.pickups.length} />
          <Stat icon={Truck} label="Deliveries to do" value={groups.deliveries.length} />
          <Stat icon={CircleCheck} label="Done today" value={groups.completed.length} tone="success" />
        </ul>
      </div>

      {groups.unsupported.length > 0 ? (
        <InlineNotice title={`${parcelsText(groups.unsupported.length)} not shown`}>
          Branch transfers aren&apos;t courier work, so they aren&apos;t shown here. Ask your dispatcher about{" "}
          {groups.unsupported.length === 1 ? "it" : "them"}.
        </InlineNotice>
      ) : null}

      {courierWorkCount === 0 ? (
        <Card className="p-6 sm:p-10">
          <EmptyState
            icon={ClipboardList}
            size="lg"
            title="No parcels assigned to you"
            description="When a dispatcher gives you parcels to pick up or deliver, they will appear here."
            actions={
              <Button asChild variant="secondary">
                <Link href={courierRoutes.history}>View parcel history</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList aria-label="Today's parcels">
            <TabsTrigger value="active" className={TAB_FOCUS}>
              Active <span className="tabular-nums">({activeCount})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className={TAB_FOCUS}>
              Completed today <span className="tabular-nums">({groups.completed.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex flex-col gap-8">
            {activeCount === 0 ? (
              <Card className="p-6 sm:p-10">
                <EmptyState
                  icon={CircleCheck}
                  title="Nothing left to do"
                  description="Every parcel you were given is finished. New parcels from your dispatcher will appear here."
                />
              </Card>
            ) : null}
            {section(
              "parcels-pickups",
              "Pickups",
              "Collect each parcel from the sender, then hand it over at the branch.",
              groups.pickups,
            )}
            {section(
              "parcels-deliveries",
              "Deliveries",
              "Take each parcel out from the branch, then deliver it or return it.",
              groups.deliveries,
            )}
            {groups.closed.length > 0 ? (
              <InlineNotice title={`${parcelsText(groups.closed.length)} closed by your dispatcher`}>
                Your dispatcher closed the task before you finished{" "}
                {groups.closed.length === 1 ? "this parcel" : "these parcels"}. Nothing more to do; they don&apos;t
                count as completed work.
              </InlineNotice>
            ) : null}
          </TabsContent>

          <TabsContent value="completed" className="flex flex-col gap-8">
            {groups.completed.length === 0 ? (
              <Card className="p-6 sm:p-10">
                <EmptyState
                  icon={ClipboardList}
                  title="Nothing completed yet today"
                  description="A parcel moves here as soon as you finish it: handed over, delivered, returned to the branch, or marked Unable to Collect."
                />
              </Card>
            ) : (
              section(
                "parcels-completed",
                "Completed today",
                "Finished today, newest first. Other parcels from the same task may still be active.",
                groups.completed,
              )
            )}
          </TabsContent>
        </Tabs>
      )}

      <ParcelActionDialog
        target={target}
        districtName={districtName}
        onClose={() => setTarget(null)}
        onSavingChange={setSaving}
        onSaved={saved}
        onFailure={failed}
      />
    </div>
  );
}

/**
 * One count on the dashboard. The icon sits in a lightly tinted tile: orange for work still to do (decoration, not a
 * parcel status), success green for done. The number and label carry the meaning; the colour only supports it.
 */
function Stat({
  icon: Icon,
  label,
  value,
  tone = "accent",
}: {
  icon: typeof ListTodo;
  label: string;
  value: number;
  tone?: "accent" | "success";
}) {
  return (
    <li className="flex h-full min-w-0 flex-col items-start gap-2 rounded-lg border border-grey-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          tone === "success" ? "bg-success-tint text-success" : "bg-orange-50 text-orange-700",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-h2 text-grey-900 tabular-nums">{value}</span>
        <span className="text-caption text-grey-600">{label}</span>
      </div>
    </li>
  );
}

/**
 * Keyboard focus drawn inside the tab. The global :focus-visible outline sits 2px outside an element, and the tab row
 * scrolls sideways (overflow-x-auto, which also clips vertically), so only the outline's right edge showed: a stray
 * orange line between "Active" and "Completed today" whenever focus came back to a tab from the keyboard (e.g. after
 * closing a form). Inside the tab it is never clipped: keyboard users see the whole focus outline; the active tab
 * keeps only its orange underline otherwise. Local to this page (the shared Tabs stay as they are).
 */
const TAB_FOCUS = "rounded-t-sm focus-visible:-outline-offset-2";

/**
 * The parcel card grid (pickups, deliveries, completed and the loading skeleton), sized by the width the section
 * actually gets (a container query: sidebar and the 1200px content cap included), not the screen width. Columns are
 * only added when every card stays at least 24.125rem wide: 21.5rem inside (the action buttons' shared side-by-side
 * width) + 2.5rem padding + the border. So in 2 and 3 columns every pair of buttons is side by side, and they stack
 * only in the one-column phone layout, where no card sits next to another:
 * - 1 column below 49.5rem of content (phones, tablets, laptops up to ~1100px wide with the sidebar)
 * - 2 columns from 49.5rem (2 × 24.125rem + 1rem gap)
 * - 3 columns from 74.5rem (3 × 24.125rem + 2 × 1rem), i.e. screens from about 1505px (content near its 1200px cap)
 */
const PARCEL_GRID = "grid grid-cols-1 gap-4 @[49.5rem]:grid-cols-2 @[74.5rem]:grid-cols-3";

function TodayLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading your parcels">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <Skeleton key={tile} className="h-24 rounded-lg sm:h-20" />
        ))}
      </div>
      <div className="@container flex flex-col gap-3">
        <Skeleton className="h-6 w-32" />
        <div className={PARCEL_GRID}>
          {[0, 1, 2].map((card) => (
            <Card key={card} className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-md" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-11 w-full" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
