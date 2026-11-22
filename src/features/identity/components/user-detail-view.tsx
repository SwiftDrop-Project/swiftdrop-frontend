"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Ban, CircleCheck, Pencil, Store, Users } from "lucide-react";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { formatDateTime, formatPhone, humanizeCode } from "@/lib/format";
import { vehicleTypeLabel } from "@/lib/reference";
import { ROLE_LABEL } from "@/lib/roles";
import { userAdminApi } from "../api";
import type { AdminUserDetail, ApprovalStatus } from "../types";
import { AccountStatusBadge } from "./account-status-badge";
import { useCurrentUser } from "./current-user";
import { RequireCurrentUser } from "./require-current-user";
import { ChangeUserStatusDialog, EditUserDialog, changeUserStatus, type StatusChange } from "./user-dialogs";

type DetailState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "ready"; user: AdminUserDetail };

const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  PENDING: "Waiting for approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const BACK = { backHref: "/admin/users", backLabel: "User Management" };

function UserDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading account details" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export function UserDetailView({ userId }: { userId?: string }) {
  return (
    <RequireCurrentUser fallback={<UserDetailSkeleton />}>
      <UserDetailReady userId={userId} />
    </RequireCurrentUser>
  );
}

function UserDetailReady({ userId }: { userId?: string }) {
  const params = useParams<{ id?: string }>();
  const id = userId ?? params.id ?? "";
  const me = useCurrentUser();
  const districts = useDistricts();
  const [state, setState] = React.useState<DetailState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const [editOpen, setEditOpen] = React.useState(false);
  const [statusChange, setStatusChange] = React.useState<StatusChange | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [prevId, setPrevId] = React.useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setState({ status: "loading" });
  }

  React.useEffect(() => {
    const controller = new AbortController();
    userAdminApi
      .getUser(id, controller.signal)
      .then((user) => setState({ status: "ready", user }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (isApiError(error) && (error.status === 404 || error.code === "VALIDATION_FAILED")) {
          setState({ status: "notFound" });
          return;
        }
        setState({
          status: "error",
          message: isApiError(error) ? error.message : "Something went wrong. Try again in a moment.",
        });
      });
    return () => controller.abort();
  }, [id, attempt]);

  if (state.status === "loading") return <UserDetailSkeleton />;

  if (state.status === "notFound") {
    return (
      <>
        <PageHeader title="Account not found" {...BACK} />
        <Card className="p-6 sm:p-10">
          <EmptyState
            icon={Users}
            title="This account couldn't be found"
            description="Check the link or go back to User Management."
            actions={
              <Button asChild>
                <Link href="/admin/users">Back to User Management</Link>
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
        <PageHeader title="Account details" {...BACK} />
        <div className="flex max-w-form-app flex-col items-start gap-4">
          <InlineNotice tone="error" title="We couldn't load this account">
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

  const { user } = state;
  const isSelf = me?.id === user.id;
  const isRemoved = user.status === "REMOVED";
  const canBlock = !isSelf && user.status === "ACTIVE";
  const canUnblock = !isSelf && user.status === "DISABLED";
  const districtName = (code: string | null) =>
    code ? (districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code)) : "—";

  async function confirmStatusChange(change: StatusChange) {
    setBusy(true);
    const updated = await changeUserStatus(user, change);
    setBusy(false);
    if (updated) {
      setState({ status: "ready", user: updated });
      setStatusChange(null);
    }
  }

  return (
    <>
      <DetailPage
        title={user.fullName}
        description={`${ROLE_LABEL[user.role]} · ID ${user.id}`}
        {...BACK}
        status={
          <div className="flex flex-wrap items-center gap-2">
            <AccountStatusBadge status={user.status} />
            {isSelf ? (
              <Badge tone="outline" dot={false}>
                You
              </Badge>
            ) : null}
          </div>
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
              <h2 className="text-h3 text-grey-900">Account access</h2>
              <p className="mt-1 text-body-sm text-grey-600">
                {isRemoved
                  ? "This account was removed. It can be viewed but not changed."
                  : isSelf
                    ? "You can't block your own account."
                    : user.status === "PENDING_APPROVAL"
                      ? "This merchant is waiting for approval. Approve or reject the application first."
                      : canBlock || canUnblock
                        ? "Blocking logs the user out at once and stops them logging in."
                        : "Only active accounts can be blocked."}
              </p>
            </div>
            {canBlock ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                disabled={busy}
                onClick={() => setStatusChange("BLOCKED")}
              >
                <Ban aria-hidden="true" />
                Block account
              </Button>
            ) : null}
            {canUnblock ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                disabled={busy}
                onClick={() => setStatusChange("ACTIVE")}
              >
                <CircleCheck aria-hidden="true" />
                Unblock account
              </Button>
            ) : null}
            {user.status === "PENDING_APPROVAL" ? (
              <Button asChild variant="secondary" className="w-full justify-start">
                <Link href="/admin/merchants">
                  <Store aria-hidden="true" />
                  Review application
                </Link>
              </Button>
            ) : null}
          </Card>
        }
      >
        <div className="flex flex-col gap-6">
          <DetailCard title="Personal information">
            <Field label="Full name">{user.fullName}</Field>
            <Field label="Email">
              <span className="break-all">{user.email}</span>
            </Field>
            <Field label="Mobile number">
              <span className="tabular-nums">{user.phone ? formatPhone(user.phone) : "Not added yet"}</span>
            </Field>
            <Field label="Registered">
              <span className="tabular-nums">{formatDateTime(user.createdAt)}</span>
            </Field>
          </DetailCard>

          <DetailCard title="Account information">
            <Field label="Role">{ROLE_LABEL[user.role]}</Field>
            <Field label="Status">
              <AccountStatusBadge status={user.status} />
            </Field>
            <Field label="Google sign-in">{user.googleLinked ? "Linked" : "Not linked"}</Field>
            <Field label="Password">
              {user.mustChangePassword ? "Must be changed at next login" : "Set by the user"}
            </Field>
            <Field label="User ID">
              <span className="break-all tabular-nums">{user.id}</span>
            </Field>
            <Field label="Last updated">
              <span className="tabular-nums">{formatDateTime(user.updatedAt)}</span>
            </Field>
            {user.deletedAt ? (
              <Field label="Removed">
                <span className="tabular-nums">{formatDateTime(user.deletedAt)}</span>
              </Field>
            ) : null}
          </DetailCard>

          {user.merchant ? (
            <DetailCard title="Business">
              <Field label="Business name">{user.merchant.businessName}</Field>
              <Field label="Approval">{APPROVAL_LABEL[user.merchant.approvalStatus]}</Field>
              <Field label="Pickup address">
                {user.merchant.city}, {districtName(user.merchant.pickupDistrict)}
              </Field>
            </DetailCard>
          ) : null}

          {user.role === "COURIER" || user.role === "DISPATCHER" ? (
            <DetailCard title="Work">
              <Field label="Branch">{districtName(user.branch)}</Field>
              {user.role === "COURIER" ? (
                <Field label="Vehicle">{user.vehicleType ? vehicleTypeLabel(user.vehicleType) : "—"}</Field>
              ) : null}
              <Field label="Staff page">
                <Link
                  href={user.role === "COURIER" ? `/admin/couriers/${user.id}` : `/admin/dispatchers/${user.id}`}
                  className="text-orange-700 hover:text-orange-800 hover:underline"
                >
                  Open in {user.role === "COURIER" ? "Courier" : "Dispatcher"} Management
                </Link>
              </Field>
            </DetailCard>
          ) : null}
        </div>
      </DetailPage>

      <EditUserDialog
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(updated) => setState({ status: "ready", user: updated })}
      />

      <ChangeUserStatusDialog
        user={user}
        change={statusChange ?? "BLOCKED"}
        open={statusChange !== null}
        onOpenChange={(open) => {
          if (!open) setStatusChange(null);
        }}
        loading={busy}
        onConfirm={() => {
          if (statusChange) void confirmStatusChange(statusChange);
        }}
      />
    </>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-h3 text-grey-900">{title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">{children}</dl>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-grey-600 uppercase">{label}</dt>
      <dd className="text-body-sm text-grey-900">{children}</dd>
    </div>
  );
}
