"use client";

import Link from "next/link";
import {
  Ban,
  Bike,
  CircleCheck,
  EllipsisVertical,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { formatDate, formatPhone, humanizeCode } from "@/lib/format";
import { vehicleTypeLabel } from "@/lib/reference";
import type { PageResponse } from "@/types";
import { staffApi } from "../api";
import type { CourierDetail, UserStatus } from "../types";
import {
  BlockCourierDialog,
  CreateCourierDialog,
  EditCourierDialog,
  RemoveCourierDialog,
  ResetCourierPasswordDialog,
} from "./courier-dialogs";
import { RequireCurrentUser } from "./require-current-user";
import { StaffStatusBadge } from "./staff-status-badge";

const PAGE_SIZE = 20;

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pageData: PageResponse<CourierDetail> };

function subscribeToNothing() {
  return () => {};
}

function readInitialSearch(): string {
  return new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
}

function CourierDirectorySkeleton() {
  return (
    <>
      <div className="flex flex-col divide-y divide-grey-100 md:hidden" aria-busy="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Courier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoading columns={7} rows={4} label="Loading couriers" />
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function CourierManagementFallback() {
  return (
    <ListPage
      title="Courier Management"
      description="Create courier accounts, update details and login emails, manage access, or reset passwords."
    >
      <Card aria-labelledby="couriers-heading-loading">
        <div className="flex items-center justify-between gap-4 border-b border-grey-200 px-4 py-4 sm:px-6">
          <h2 id="couriers-heading-loading" className="text-h3 text-grey-900">
            Courier directory
          </h2>
        </div>
        <CourierDirectorySkeleton />
      </Card>
    </ListPage>
  );
}

export function CourierManagement() {
  return (
    <RequireCurrentUser fallback={<CourierManagementFallback />}>
      <CourierManagementReady />
    </RequireCurrentUser>
  );
}

function CourierManagementReady() {
  const districts = useDistricts();
  const urlQuery = React.useSyncExternalStore(subscribeToNothing, readInitialSearch, () => "");
  const [appliedUrlQuery, setAppliedUrlQuery] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"" | UserStatus>("");
  const [page, setPage] = React.useState(0);
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<ListState>({ status: "loading" });

  // Dialog targets
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCourier, setEditingCourier] = React.useState<CourierDetail | null>(null);
  const [resettingCourier, setResettingCourier] = React.useState<CourierDetail | null>(null);
  const [blockingCourier, setBlockingCourier] = React.useState<CourierDetail | null>(null);
  const [removingCourier, setRemovingCourier] = React.useState<CourierDetail | null>(null);
  const [busyActionId, setBusyActionId] = React.useState<string | null>(null);

  if (urlQuery && urlQuery !== appliedUrlQuery) {
    setAppliedUrlQuery(urlQuery);
    setSearchInput(urlQuery);
    setDebouncedQuery(urlQuery);
  }

  React.useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === debouncedQuery) return undefined;
    const timer = window.setTimeout(() => {
      setState({ status: "loading" });
      setDebouncedQuery(trimmed);
      setPage(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, debouncedQuery]);

  React.useEffect(() => {
    const controller = new AbortController();

    staffApi
      .listCouriers(
        {
          q: debouncedQuery || undefined,
          branch: branchFilter || undefined,
          status: statusFilter || undefined,
          page,
          size: PAGE_SIZE,
        },
        controller.signal,
      )
      .then((pageData) => setState({ status: "ready", pageData }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: isApiError(error) ? error.message : "Something went wrong. Try again in a moment.",
        });
      });

    return () => controller.abort();
  }, [debouncedQuery, branchFilter, statusFilter, page, attempt]);

  const reload = React.useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  const districtName = React.useCallback(
    (code: string | null) => {
      if (!code) return "—";
      return districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code);
    },
    [districts.districts],
  );

  const hasFilters = Boolean(searchInput.trim() || branchFilter || statusFilter);

  function clearFilters() {
    setState({ status: "loading" });
    setSearchInput("");
    setDebouncedQuery("");
    setBranchFilter("");
    setStatusFilter("");
    setPage(0);
  }

  async function handleBlock(courier: CourierDetail) {
    setBusyActionId(courier.id);
    try {
      const updated = await staffApi.blockCourier(courier.id);
      toast({
        tone: "info",
        title: `${updated.fullName} blocked`,
        description: "Active sessions ended and new parcel assignments are disabled.",
      });
      setBlockingCourier(null);
      reload();
    } catch (error) {
      toast({
        tone: "error",
        title: `We couldn't block ${courier.fullName}`,
        description: isApiError(error) ? error.message : "Try again in a moment.",
      });
    } finally {
      setBusyActionId(null);
    }
  }

  async function handleUnblock(courier: CourierDetail) {
    setBusyActionId(courier.id);
    try {
      const updated = await staffApi.unblockCourier(courier.id);
      toast({
        tone: "success",
        title: `${updated.fullName} unblocked`,
        description: "They can now log in and receive parcel assignments.",
      });
      reload();
    } catch (error) {
      toast({
        tone: "error",
        title: `We couldn't unblock ${courier.fullName}`,
        description: isApiError(error) ? error.message : "Try again in a moment.",
      });
    } finally {
      setBusyActionId(null);
    }
  }

  async function handleRemove(courier: CourierDetail) {
    setBusyActionId(courier.id);
    try {
      const removed = await staffApi.removeCourier(courier.id);
      toast({
        tone: "info",
        title: `${removed.fullName} removed`,
        description: "The account is permanently deactivated and delivery history is preserved.",
      });
      setRemovingCourier(null);
      reload();
    } catch (error) {
      toast({
        tone: "error",
        title: `We couldn't remove ${courier.fullName}`,
        description: isApiError(error) ? error.message : "Try again in a moment.",
      });
    } finally {
      setBusyActionId(null);
    }
  }

  const toolbar = (
    <>
      <div className="relative w-full sm:max-w-xs">
        <label htmlFor="courier-search" className="sr-only">
          Search couriers
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-grey-600"
          aria-hidden="true"
        />
        <Input
          id="courier-search"
          type="search"
          size="md"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name, email or mobile"
          className="pl-12 text-body-sm"
        />
      </div>

      <div className="w-full sm:w-48">
        <label htmlFor="courier-branch-filter" className="sr-only">
          Filter by branch
        </label>
        <Select
          id="courier-branch-filter"
          size="md"
          value={branchFilter}
          onChange={(event) => {
            setState({ status: "loading" });
            setBranchFilter(event.target.value);
            setPage(0);
          }}
        >
          <option value="">All branches</option>
          {districts.districts.map((district) => (
            <option key={district.code} value={district.code}>
              {district.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-full sm:w-48">
        <label htmlFor="courier-status-filter" className="sr-only">
          Filter by status
        </label>
        <Select
          id="courier-status-filter"
          size="md"
          value={statusFilter}
          onChange={(event) => {
            setState({ status: "loading" });
            setStatusFilter(event.target.value as "" | UserStatus);
            setPage(0);
          }}
        >
          <option value="">Active &amp; blocked</option>
          <option value="ACTIVE">Active only</option>
          <option value="DISABLED">Blocked only</option>
          <option value="REMOVED">Removed</option>
        </Select>
      </div>

      {hasFilters ? (
        <Button type="button" variant="tertiary" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : null}
    </>
  );

  return (
    <>
      <ListPage
        title="Courier Management"
        description="Create courier accounts, update details and login emails, manage access, or reset passwords."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Add courier
          </Button>
        }
        toolbar={toolbar}
      >
        <Card aria-labelledby="couriers-heading">
          <div className="flex items-center justify-between gap-4 border-b border-grey-200 px-4 py-4 sm:px-6">
            <h2 id="couriers-heading" className="text-h3 text-grey-900">
              {statusFilter === "REMOVED" ? "Removed couriers" : "Courier directory"}
            </h2>
            {state.status === "ready" ? (
              <p className="text-label text-grey-600 tabular-nums">
                {state.pageData.totalElements}{" "}
                {state.pageData.totalElements === 1 ? "courier" : "couriers"}
              </p>
            ) : null}
          </div>

          {state.status === "error" ? (
            <div className="flex flex-col items-start gap-4 p-4 sm:p-6">
              <InlineNotice tone="error" title="We couldn't load couriers">
                {state.message}
              </InlineNotice>
              <Button variant="secondary" onClick={reload}>
                Try again
              </Button>
            </div>
          ) : null}

          {state.status === "loading" ? (
            <>
              <div className="flex flex-col divide-y divide-grey-100 md:hidden" aria-busy="true">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex flex-col gap-3 p-4">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Courier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableLoading columns={7} rows={4} label="Loading couriers" />
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}

          {state.status === "ready" && state.pageData.content.length === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                icon={Bike}
                title={hasFilters ? "No couriers match these filters" : "No couriers added yet"}
                description={
                  hasFilters
                    ? "Try a different search term, branch or status filter."
                    : "Create your first courier account to start assigning deliveries."
                }
                actions={
                  hasFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus aria-hidden="true" />
                      Add courier
                    </Button>
                  )
                }
              />
            </div>
          ) : null}

          {state.status === "ready" && state.pageData.content.length > 0 ? (
            <>
              {/* Mobile stacked cards */}
              <ul className="divide-y divide-grey-100 md:hidden">
                {state.pageData.content.map((courier) => (
                  <li key={courier.id} className="flex flex-col gap-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/couriers/${courier.id}`}
                          className="text-label font-semibold text-grey-900 hover:text-orange-700 hover:underline"
                        >
                          {courier.fullName}
                        </Link>
                        <p className="mt-0.5 break-all text-body-sm text-grey-600">{courier.email}</p>
                      </div>
                      <CourierRowMenu
                        courier={courier}
                        busy={busyActionId === courier.id}
                        onEdit={() => setEditingCourier(courier)}
                        onResetPassword={() => setResettingCourier(courier)}
                        onBlock={() => setBlockingCourier(courier)}
                        onUnblock={() => void handleUnblock(courier)}
                        onRemove={() => setRemovingCourier(courier)}
                      />
                    </div>

                    <StaffStatusBadge
                      status={courier.status}
                      mustChangePassword={courier.mustChangePassword}
                    />

                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                      <dt className="text-grey-600">Mobile</dt>
                      <dd className="tabular-nums">
                        {courier.phone ? formatPhone(courier.phone) : "—"}
                      </dd>
                      <dt className="text-grey-600">Branch</dt>
                      <dd>{districtName(courier.branch)}</dd>
                      <dt className="text-grey-600">Vehicle</dt>
                      <dd>{courier.vehicleType ? vehicleTypeLabel(courier.vehicleType) : "—"}</dd>
                      <dt className="text-grey-600">Joined</dt>
                      <dd className="tabular-nums">{formatDate(courier.createdAt)}</dd>
                    </dl>

                    <div className="flex gap-2">
                      <Button asChild variant="secondary" className="w-full">
                        <Link href={`/admin/couriers/${courier.id}`}>View details</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Tablet & desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Courier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.pageData.content.map((courier) => (
                      <TableRow key={courier.id}>
                        <TableCell>
                          <Link
                            href={`/admin/couriers/${courier.id}`}
                            className="text-label font-semibold text-grey-900 hover:text-orange-700 hover:underline"
                          >
                            {courier.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="break-all">{courier.email}</p>
                          <p className="text-grey-600 tabular-nums">
                            {courier.phone ? formatPhone(courier.phone) : "—"}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {districtName(courier.branch)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {courier.vehicleType ? vehicleTypeLabel(courier.vehicleType) : "—"}
                        </TableCell>
                        <TableCell>
                          <StaffStatusBadge
                            status={courier.status}
                            mustChangePassword={courier.mustChangePassword}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDate(courier.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="secondary">
                              <Link href={`/admin/couriers/${courier.id}`}>View</Link>
                            </Button>
                            <CourierRowMenu
                              courier={courier}
                              busy={busyActionId === courier.id}
                              onEdit={() => setEditingCourier(courier)}
                              onResetPassword={() => setResettingCourier(courier)}
                              onBlock={() => setBlockingCourier(courier)}
                              onUnblock={() => void handleUnblock(courier)}
                              onRemove={() => setRemovingCourier(courier)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                page={state.pageData.page}
                totalPages={state.pageData.totalPages}
                totalElements={state.pageData.totalElements}
                size={state.pageData.size}
                onPageChange={(nextPage) => {
                  setState({ status: "loading" });
                  setPage(nextPage);
                }}
                itemLabel="couriers"
              />
            </>
          ) : null}
        </Card>
      </ListPage>

      <CreateCourierDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setPage(0);
          reload();
        }}
      />

      <EditCourierDialog
        courier={editingCourier}
        open={editingCourier !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCourier(null);
        }}
        onUpdated={() => reload()}
      />

      <ResetCourierPasswordDialog
        courier={resettingCourier}
        open={resettingCourier !== null}
        onOpenChange={(open) => {
          if (!open) setResettingCourier(null);
        }}
        onReset={() => reload()}
      />

      <BlockCourierDialog
        courier={blockingCourier}
        open={blockingCourier !== null}
        onOpenChange={(open) => {
          if (!open) setBlockingCourier(null);
        }}
        loading={blockingCourier !== null && busyActionId === blockingCourier.id}
        onConfirm={(courier) => void handleBlock(courier)}
      />

      <RemoveCourierDialog
        courier={removingCourier}
        open={removingCourier !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingCourier(null);
        }}
        loading={removingCourier !== null && busyActionId === removingCourier.id}
        onConfirm={(courier) => void handleRemove(courier)}
      />
    </>
  );
}

function CourierRowMenu({
  courier,
  busy,
  onEdit,
  onResetPassword,
  onBlock,
  onUnblock,
  onRemove,
}: {
  courier: CourierDetail;
  busy: boolean;
  onEdit: () => void;
  onResetPassword: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onRemove: () => void;
}) {
  if (courier.status === "REMOVED") {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant="tertiary"
          label={`Actions for ${courier.fullName}`}
          disabled={busy}
        >
          <EllipsisVertical className="size-5" aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden="true" />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onResetPassword}>
          <KeyRound aria-hidden="true" />
          Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {courier.status === "DISABLED" ? (
          <DropdownMenuItem onSelect={onUnblock}>
            <CircleCheck aria-hidden="true" />
            Unblock courier
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onBlock}>
            <Ban aria-hidden="true" />
            Block courier
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onRemove} className="text-error">
          <Trash2 className="text-error" aria-hidden="true" />
          Remove courier
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
