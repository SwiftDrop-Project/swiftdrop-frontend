"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Ban, Bike, CircleCheck, KeyRound, Pencil, Trash2 } from "lucide-react";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { formatDateTime, formatPhone, humanizeCode } from "@/lib/format";
import { vehicleTypeLabel } from "@/lib/reference";
import { staffApi } from "../api";
import type { CourierDetail } from "../types";
import {
  BlockCourierDialog,
  EditCourierDialog,
  RemoveCourierDialog,
  ResetCourierPasswordDialog,
} from "./courier-dialogs";
import { RequireCurrentUser } from "./require-current-user";
import { StaffStatusBadge } from "./staff-status-badge";

type DetailState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "ready"; courier: CourierDetail };

function CourierDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading courier details" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export function CourierDetailView({ courierId }: { courierId?: string }) {
  return (
    <RequireCurrentUser fallback={<CourierDetailSkeleton />}>
      <CourierDetailReady courierId={courierId} />
    </RequireCurrentUser>
  );
}

function CourierDetailReady({ courierId }: { courierId?: string }) {
  const params = useParams<{ id?: string }>();
  const resolvedCourierId = courierId ?? params.id ?? "";
  const districts = useDistricts();
  const [state, setState] = React.useState<DetailState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  const [editOpen, setEditOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState<"block" | "unblock" | "remove" | null>(null);

  const [prevCourierId, setPrevCourierId] = React.useState(resolvedCourierId);
  if (resolvedCourierId !== prevCourierId) {
    setPrevCourierId(resolvedCourierId);
    setState({ status: "loading" });
  }

  React.useEffect(() => {
    const controller = new AbortController();

    staffApi
      .getCourier(resolvedCourierId, controller.signal)
      .then((courier) => setState({ status: "ready", courier }))
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
  }, [resolvedCourierId, attempt]);

  if (state.status === "loading") {
    return <CourierDetailSkeleton />;
  }

  if (state.status === "notFound") {
    return (
      <>
        <PageHeader title="Courier not found" backHref="/admin/couriers" backLabel="Courier Management" />
        <Card className="p-6 sm:p-10">
          <EmptyState
            icon={Bike}
            title="This courier couldn't be found"
            description="Check the link or go back to Courier Management."
            actions={
              <Button asChild>
                <Link href="/admin/couriers">Back to Courier Management</Link>
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
        <PageHeader title="Courier details" backHref="/admin/couriers" backLabel="Courier Management" />
        <div className="flex max-w-form-app flex-col items-start gap-4">
          <InlineNotice tone="error" title="We couldn't load this courier">
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

  const { courier } = state;
  const isRemoved = courier.status === "REMOVED";
  const branchName = courier.branch
    ? (districts.districts.find((district) => district.code === courier.branch)?.name ??
      humanizeCode(courier.branch))
    : "—";

  async function handleBlock() {
    setBusyAction("block");
    try {
      const updated = await staffApi.blockCourier(courier.id);
      setState({ status: "ready", courier: updated });
      setBlockOpen(false);
      toast({
        tone: "info",
        title: `${updated.fullName} blocked`,
        description: "Active sessions ended and new parcel assignments are disabled.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: `We couldn't block ${courier.fullName}`,
        description: isApiError(error) ? error.message : "Try again in a moment.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUnblock() {
    setBusyAction("unblock");
    try {
      const updated = await staffApi.unblockCourier(courier.id);
      setState({ status: "ready", courier: updated });
      toast({
        tone: "success",
        title: `${updated.fullName} unblocked`,
        description: "They can now log in and receive parcel assignments.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: `We couldn't unblock ${courier.fullName}`,
        description: isApiError(error) ? error.message : "Try again in a moment.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRemove() {
    setBusyAction("remove");
    try {
      const updated = await staffApi.removeCourier(courier.id);
      setState({ status: "ready", courier: updated });
      setRemoveOpen(false);
      toast({
        tone: "info",
        title: `${updated.fullName} removed`,
        description: "Account permanently deactivated while preserving delivery history.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: `We couldn't remove ${courier.fullName}`,
        description: isApiError(error) ? error.message : "Try again in a moment.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <>
      <DetailPage
        title={courier.fullName}
        description={courier.email}
        backHref="/admin/couriers"
        backLabel="Courier Management"
        status={
          <StaffStatusBadge
            status={courier.status}
            mustChangePassword={courier.mustChangePassword}
          />
        }
        actions={
          !isRemoved ? (
            <Button type="button" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden="true" />
              Edit details
            </Button>
          ) : undefined
        }
        aside={
          <Card className="flex flex-col gap-4 p-5">
            <div>
              <h2 className="text-h3 text-grey-900">Account actions</h2>
              <p className="mt-1 text-body-sm text-grey-600">
                {isRemoved
                  ? "This courier account was permanently removed. Past delivery and parcel assignments remain preserved."
                  : "Security changes take effect immediately and sign out active courier sessions."}
              </p>
            </div>

            {!isRemoved ? (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-start"
                  disabled={busyAction !== null}
                  onClick={() => setResetOpen(true)}
                >
                  <KeyRound aria-hidden="true" />
                  Reset password
                </Button>

                {courier.status === "DISABLED" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-start"
                    loading={busyAction === "unblock"}
                    disabled={busyAction !== null}
                    onClick={() => void handleUnblock()}
                  >
                    <CircleCheck aria-hidden="true" />
                    Unblock courier
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-start"
                    disabled={busyAction !== null}
                    onClick={() => setBlockOpen(true)}
                  >
                    <Ban aria-hidden="true" />
                    Block courier
                  </Button>
                )}

                <Button
                  type="button"
                  variant="tertiary"
                  className="w-full justify-start text-error hover:text-error"
                  disabled={busyAction !== null}
                  onClick={() => setRemoveOpen(true)}
                >
                  <Trash2 aria-hidden="true" />
                  Remove courier
                </Button>
              </div>
            ) : null}
          </Card>
        }
      >
        <div className="flex flex-col gap-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-h3 text-grey-900">Courier profile</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-grey-600 uppercase">Full name</dt>
                <dd className="mt-1 text-body font-medium text-grey-900">{courier.fullName}</dd>
              </div>
              <div>
                <dt className="text-caption text-grey-600 uppercase">Login email</dt>
                <dd className="mt-1 break-all text-body text-grey-900">{courier.email}</dd>
              </div>
              <div>
                <dt className="text-caption text-grey-600 uppercase">Mobile number</dt>
                <dd className="mt-1 text-body text-grey-900 tabular-nums">
                  {courier.phone ? formatPhone(courier.phone) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-grey-600 uppercase">Branch</dt>
                <dd className="mt-1 text-body text-grey-900">{branchName}</dd>
              </div>
              <div>
                <dt className="text-caption text-grey-600 uppercase">Vehicle type</dt>
                <dd className="mt-1 text-body text-grey-900">
                  {courier.vehicleType ? vehicleTypeLabel(courier.vehicleType) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-grey-600 uppercase">Dispatch eligibility</dt>
                <dd className="mt-1 text-body text-grey-900">
                  {courier.status === "ACTIVE"
                    ? "Eligible for parcel assignments"
                    : courier.status === "DISABLED"
                      ? "Not assignable while blocked"
                      : "Permanently removed from dispatch"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-h3 text-grey-900">Security &amp; lifecycle</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-grey-600 uppercase">Password state</dt>
                <dd className="mt-1 text-body text-grey-900">
                  {isRemoved
                    ? "Sign-in disabled"
                    : courier.mustChangePassword
                      ? "Must change temporary password on next login"
                      : "Courier-chosen password active"}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-grey-600 uppercase">Created</dt>
                <dd className="mt-1 text-body text-grey-900 tabular-nums">
                  {formatDateTime(courier.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-grey-600 uppercase">Last updated</dt>
                <dd className="mt-1 text-body text-grey-900 tabular-nums">
                  {formatDateTime(courier.updatedAt)}
                </dd>
              </div>
              {courier.deletedAt ? (
                <div>
                  <dt className="text-caption text-grey-600 uppercase">Removed</dt>
                  <dd className="mt-1 text-body text-grey-900 tabular-nums">
                    {formatDateTime(courier.deletedAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>
      </DetailPage>

      <EditCourierDialog
        courier={courier}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(updated) => setState({ status: "ready", courier: updated })}
      />

      <ResetCourierPasswordDialog
        courier={courier}
        open={resetOpen}
        onOpenChange={setResetOpen}
        onReset={(updated) => setState({ status: "ready", courier: updated })}
      />

      <BlockCourierDialog
        courier={courier}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        loading={busyAction === "block"}
        onConfirm={() => void handleBlock()}
      />

      <RemoveCourierDialog
        courier={courier}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        loading={busyAction === "remove"}
        onConfirm={() => void handleRemove()}
      />
    </>
  );
}
