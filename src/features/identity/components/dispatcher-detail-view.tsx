"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Headset } from "lucide-react";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { formatDateTime, formatPhone, humanizeCode } from "@/lib/format";
import { staffApi } from "../api";
import type { DispatcherDetail } from "../types";
import { RequireCurrentUser } from "./require-current-user";
import { StaffStatusBadge } from "./staff-status-badge";

type DetailState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "ready"; dispatcher: DispatcherDetail };

function DispatcherDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading dispatcher details" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}

export function DispatcherDetailView({ dispatcherId }: { dispatcherId?: string }) {
  return (
    <RequireCurrentUser fallback={<DispatcherDetailSkeleton />}>
      <DispatcherDetailReady dispatcherId={dispatcherId} />
    </RequireCurrentUser>
  );
}

function DispatcherDetailReady({ dispatcherId }: { dispatcherId?: string }) {
  const params = useParams<{ id?: string }>();
  const resolvedDispatcherId = dispatcherId ?? params.id ?? "";
  const districts = useDistricts();
  const [state, setState] = React.useState<DetailState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  const [prevDispatcherId, setPrevDispatcherId] = React.useState(resolvedDispatcherId);
  if (resolvedDispatcherId !== prevDispatcherId) {
    setPrevDispatcherId(resolvedDispatcherId);
    setState({ status: "loading" });
  }

  React.useEffect(() => {
    const controller = new AbortController();

    staffApi
      .getDispatcher(resolvedDispatcherId, controller.signal)
      .then((dispatcher) => setState({ status: "ready", dispatcher }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiError(error) && error.status === 404) {
          setState({ status: "notFound" });
          return;
        }
        setState({
          status: "error",
          message: isApiError(error) ? error.message : "Something went wrong. Try again in a moment.",
        });
      });

    return () => controller.abort();
  }, [resolvedDispatcherId, attempt]);

  if (state.status === "loading") {
    return <DispatcherDetailSkeleton />;
  }

  if (state.status === "notFound") {
    return (
      <>
        <PageHeader title="Dispatcher not found" backHref="/admin/dispatchers" backLabel="Dispatcher Management" />
        <Card className="p-6 sm:p-10">
          <EmptyState
            icon={Headset}
            title="This dispatcher couldn't be found"
            description="Check the link or go back to Dispatcher Management."
            actions={
              <Button asChild>
                <Link href="/admin/dispatchers">Back to Dispatcher Management</Link>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  if (state.status === "error") {
    return (
      <>
        <PageHeader title="Dispatcher details" backHref="/admin/dispatchers" backLabel="Dispatcher Management" />
        <div className="flex max-w-form-app flex-col items-start gap-4">
          <InlineNotice tone="error" title="We couldn't load this dispatcher">
            {state.message}
          </InlineNotice>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </>
    );
  }

  const { dispatcher } = state;
  const branchName = dispatcher.branch
    ? (districts.districts.find((district) => district.code === dispatcher.branch)?.name ??
      humanizeCode(dispatcher.branch))
    : "—";

  return (
    <DetailPage
      title={dispatcher.fullName}
      description={dispatcher.email}
      backHref="/admin/dispatchers"
      backLabel="Dispatcher Management"
      status={
        <StaffStatusBadge
          status={dispatcher.status}
          mustChangePassword={dispatcher.mustChangePassword}
        />
      }
      aside={
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-h3 text-grey-900">Onboarding status</h2>
          <p className="text-body-sm text-grey-600">
            {dispatcher.mustChangePassword
              ? "This dispatcher still has their initial admin-assigned password and will be required to set a personal password on first sign-in."
              : "This dispatcher has completed their first-login password change and can access the Dispatcher dashboard."}
          </p>
        </Card>
      }
    >
      <div className="flex flex-col gap-6">
        <Card className="p-5 sm:p-6">
          <h2 className="text-h3 text-grey-900">Dispatcher profile</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-grey-600 uppercase">Full name</dt>
              <dd className="mt-1 text-body font-medium text-grey-900">{dispatcher.fullName}</dd>
            </div>
            <div>
              <dt className="text-caption text-grey-600 uppercase">Login email</dt>
              <dd className="mt-1 break-all text-body text-grey-900">{dispatcher.email}</dd>
            </div>
            <div>
              <dt className="text-caption text-grey-600 uppercase">Mobile number</dt>
              <dd className="mt-1 text-body text-grey-900 tabular-nums">
                {dispatcher.phone ? formatPhone(dispatcher.phone) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-grey-600 uppercase">Branch</dt>
              <dd className="mt-1 text-body text-grey-900">{branchName}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-h3 text-grey-900">Account timestamps</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-caption text-grey-600 uppercase">Created</dt>
              <dd className="mt-1 text-body text-grey-900 tabular-nums">
                {formatDateTime(dispatcher.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-grey-600 uppercase">Last updated</dt>
              <dd className="mt-1 text-body text-grey-900 tabular-nums">
                {formatDateTime(dispatcher.updatedAt)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </DetailPage>
  );
}
