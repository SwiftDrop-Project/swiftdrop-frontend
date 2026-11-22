"use client";

import { RotateCw } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { PageColumns } from "@/components/layout/page-columns";
import { useAdminPricing } from "../hooks/use-admin-pricing";
import { BranchesCard } from "./branches-card";
import { PriceCalculator } from "./price-calculator";
import { OlderRateCards } from "./rate-card-history";
import { RateCardSummary, SHOW_OLDER_VERSIONS_ID } from "./rate-card-summary";
import { RouteTableCard } from "./route-table-card";

/**
 * The admin's Zones & Pricing page (/admin/zones): the price calculator, the routes from a branch, the branches and
 * the active rate card. "See older versions" on the rate card opens the older versions' table at the top of the page.
 * Read only: rate cards change through the backend's migrations.
 */
export function ZonesPricing() {
  const { state, retry } = useAdminPricing();
  const [showOlder, setShowOlder] = React.useState(false);

  const hideOlder = React.useCallback(() => {
    setShowOlder(false);
    // The Hide button goes away with the table: put focus back on the button that opened it.
    requestAnimationFrame(() => document.getElementById(SHOW_OLDER_VERSIONS_ID)?.focus());
  }, []);

  if (state.status === "error") {
    return (
      <InlineNotice tone="error" title="We couldn't load zones and pricing">
        <p>{state.message}</p>
        <Button variant="secondary" className="mt-3" onClick={retry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </InlineNotice>
    );
  }

  const data = state.status === "ready" ? state.data : null;

  return (
    <div className="flex flex-col gap-6">
      {showOlder ? <OlderRateCards active={data ? data.rateCard : null} onClose={hideOlder} /> : null}
      <InlineNotice tone="info" title="Read only">
        <p>
          These are the prices customers are charged now. Rates and branches change through a new rate card version in
          the backend, so past parcels keep the price they were booked with.
        </p>
      </InlineNotice>
      <PageColumns
        aside={
          <RateCardSummary
            card={data ? data.rateCard : null}
            onShowOlderVersions={() => setShowOlder(true)}
            olderVersionsShown={showOlder}
          />
        }
      >
        <PriceCalculator districts={data ? data.districts : null} />
        <RouteTableCard districts={data ? data.districts : null} />
        <BranchesCard districts={data ? data.districts : null} />
      </PageColumns>
    </div>
  );
}
