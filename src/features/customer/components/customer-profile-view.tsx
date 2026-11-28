"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserState } from "@/features/identity";
import { isApiError } from "@/lib/api";
import { customerApi } from "../api";
import type { CustomerAddressSummary, CustomerProfileResponse } from "../types";
import { CustomerProfileHeaderCard } from "./customer-profile-header-card";
import { DeliveryPreferencesCard } from "./delivery-preferences-card";
import { PasswordSecurityCard } from "./password-security-card";
import { PersonalDetailsCard } from "./personal-details-card";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      profile: CustomerProfileResponse;
      addresses: CustomerAddressSummary[];
    }
  | { status: "error"; message: string };

export function CustomerProfileView() {
  const { state: userState } = useCurrentUserState();
  const [loadState, setLoadState] = React.useState<LoadState>({ status: "loading" });
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      customerApi.getProfile(controller.signal),
      customerApi.getAddresses(controller.signal),
    ])
      .then(([profile, addresses]) => {
        setLoadState({
          status: "ready",
          profile,
          addresses,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadState({
          status: "error",
          message: isApiError(error)
            ? error.message
            : "We couldn't reach SwiftDrop backend. Check your connection or verify the backend is running.",
        });
      });

    return () => controller.abort();
  }, [userState, retryCount]);

  function handleProfileUpdated(updated: CustomerProfileResponse) {
    if (loadState.status === "ready") {
      setLoadState({
        ...loadState,
        profile: updated,
      });
    }
  }

  function handlePreferencesUpdated(updated: CustomerProfileResponse) {
    if (loadState.status === "ready") {
      setLoadState({
        ...loadState,
        profile: updated,
      });
    }
  }

  if (loadState.status === "loading") {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        {/* Top card skeleton */}
        <Card>
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2-columns skeleton */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-5 p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-28" />
            </CardContent>
          </Card>
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="flex flex-col gap-5 p-6">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 p-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="flex max-w-form-app flex-col items-start gap-4">
        <InlineNotice tone="error" title="We couldn't load your profile">
          {loadState.message}
        </InlineNotice>
        <Button variant="secondary" onClick={() => setRetryCount((c) => c + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CustomerProfileHeaderCard profile={loadState.profile} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <PersonalDetailsCard
          profile={loadState.profile}
          onProfileUpdated={handleProfileUpdated}
        />

        <div className="flex flex-col gap-6">
          <DeliveryPreferencesCard
            profile={loadState.profile}
            addresses={loadState.addresses}
            onPreferencesUpdated={handlePreferencesUpdated}
          />
          <PasswordSecurityCard />
        </div>
      </div>
    </div>
  );
}
