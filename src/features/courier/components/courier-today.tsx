"use client";

import Link from "next/link";
import { CircleCheck, Truck } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { courierApi } from "../api";
import { useDistrictName } from "../hooks/use-district-name";
import { describeCourierError, type CourierError } from "../lib/errors";
import { courierRoutes, isFinished } from "../lib/labels";
import type { CourierToday as CourierTodayData } from "../types";
import { CourierDeliveryCard } from "./courier-delivery-card";
import { LoadError } from "./load-error";

type TodayState =
  | { status: "loading" }
  | { status: "error"; error: CourierError }
  | { status: "ready"; today: CourierTodayData };

const parcels = (count: number) => `${count} ${count === 1 ? "parcel" : "parcels"}`;

/** GET /courier/deliveries/today: "To do" (pickups first, in the API's order) and "Done today". */
export function CourierToday() {
  const [state, setState] = React.useState<TodayState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const districtName = useDistrictName();

  React.useEffect(() => {
    const controller = new AbortController();
    courierApi
      .today(controller.signal)
      .then((today) => setState({ status: "ready", today }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: describeCourierError(error) });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = () => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  if (state.status === "loading") return <LoadingCard />;

  if (state.status === "error") {
    return (
      <Card className="p-4 sm:p-6">
        <LoadError error={state.error} title="We couldn't load your deliveries" onRetry={reload} />
      </Card>
    );
  }

  const { today } = state;
  const open = today.items.filter((parcel) => !isFinished(parcel.status));
  const finished = today.items.filter((parcel) => isFinished(parcel.status));

  if (today.items.length === 0) {
    return (
      <Card className="p-6 sm:p-10">
        <EmptyState
          icon={Truck}
          size="lg"
          title="No deliveries assigned for today"
          description="When the dispatcher assigns parcels to you, they will appear here with the pickup and delivery addresses."
          actions={
            <Button asChild>
              <Link href={courierRoutes.history}>View delivery history</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card aria-labelledby="today-todo">
        <CardHeader
          titleId="today-todo"
          title="To do"
          description={`${formatDate(today.date)}. Pickups first, then deliveries, oldest first.`}
          aside={<p className="text-label text-grey-600 tabular-nums">{parcels(today.toDo)}</p>}
        />
        {open.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              icon={CircleCheck}
              headingLevel="h3"
              title="Nothing left to do today"
              description="Every parcel assigned to you is delivered or marked as failed."
            />
          </div>
        ) : (
          <ul className="divide-y divide-grey-100">
            {open.map((parcel) => (
              <CourierDeliveryCard key={parcel.parcelId} parcel={parcel} districtName={districtName} />
            ))}
          </ul>
        )}
      </Card>

      {finished.length > 0 ? (
        <Card aria-labelledby="today-done">
          <CardHeader
            titleId="today-done"
            title="Done today"
            aside={<p className="text-label text-grey-600 tabular-nums">{parcels(today.done)}</p>}
          />
          <ul className="divide-y divide-grey-100">
            {finished.map((parcel) => (
              <CourierDeliveryCard key={parcel.parcelId} parcel={parcel} districtName={districtName} />
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function LoadingCard() {
  return (
    <Card aria-busy="true" aria-label="Loading today's deliveries">
      <div className="border-b border-grey-200 px-4 py-4 sm:px-6">
        <Skeleton className="h-6 w-24" />
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3 border-b border-grey-100 p-4 last:border-b-0 sm:px-6">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </Card>
  );
}
