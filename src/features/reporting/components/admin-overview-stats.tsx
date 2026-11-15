"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { useAdminOverview } from "../hooks/use-admin-overview";
import { AccountsCard } from "./accounts-card";
import { DeliveryTodayCard } from "./delivery-today-card";
import { NewestAccountsCard } from "./newest-accounts-card";
import { WeeklyDeliveriesCard } from "./weekly-deliveries-card";

/**
 * The figures on the admin home page (GET /admin/reports/overview): parcels today and in the last 7 days, accounts per
 * role with the merchants waiting for approval, and the newest accounts.
 */
export function AdminOverviewStats() {
  const { state, refreshing, reload } = useAdminOverview();

  if (state.status === "error") {
    return (
      <InlineNotice tone="error" title="We couldn't load the overview figures">
        <p>{state.message}</p>
        <Button variant="secondary" className="mt-3" onClick={reload}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </InlineNotice>
    );
  }

  const data = state.status === "ready" ? state.data : null;

  return (
    <div className="flex flex-col gap-6">
      <DeliveryTodayCard
        data={data}
        loadedAt={state.status === "ready" ? state.loadedAt : null}
        refreshing={refreshing}
        onRefresh={reload}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WeeklyDeliveriesCard week={data ? data.last7Days : null} />
        </div>
        <div className="lg:col-span-2">
          <AccountsCard users={data ? data.users : null} />
        </div>
      </div>
      <NewestAccountsCard accounts={data ? data.recentUsers : null} />
    </div>
  );
}
