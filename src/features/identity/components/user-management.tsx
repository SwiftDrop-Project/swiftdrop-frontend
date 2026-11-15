"use client";

import Link from "next/link";
import {
  Ban,
  CircleCheck,
  EllipsisVertical,
  Pencil,
  Search,
  ShieldCheck,
  Store,
  UserPlus,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { ListPage } from "@/components/layout/list-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from "@/components/ui/table";
import { isApiError } from "@/lib/api";
import { formatDate, formatPhone } from "@/lib/format";
import { ROLE_LABEL, ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { PageResponse, Role } from "@/types";
import { userAdminApi } from "../api";
import type { AdminUser, UserSort, UserStats, UserStatusFilter } from "../types";
import { AccountStatusBadge } from "./account-status-badge";
import { useCurrentUser } from "./current-user";
import { RequireCurrentUser } from "./require-current-user";
import { ChangeUserStatusDialog, EditUserDialog, changeUserStatus, type StatusChange } from "./user-dialogs";

const PAGE_SIZE = 20;
const UNKNOWN_ERROR = "Something went wrong. Try again in a moment.";
const countFormat = new Intl.NumberFormat("en-LK");

const STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "REMOVED", label: "Removed" },
];

const SORT_OPTIONS: { value: UserSort; label: string }[] = [
  { value: "NEWEST", label: "Newest first" },
  { value: "OLDEST", label: "Oldest first" },
  { value: "NAME", label: "Name A–Z" },
];

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pageData: PageResponse<AdminUser> };

type StatsState = { status: "loading" } | { status: "error" } | { status: "ready"; stats: UserStats };

/** The first 8 characters of a user id, enough to tell accounts apart on screen. */
function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function UserManagement() {
  return (
    <RequireCurrentUser fallback={<UserManagementFallback />}>
      <UserManagementReady />
    </RequireCurrentUser>
  );
}

function UserManagementFallback() {
  return (
    <ListPage title="User Management" description="Find any SwiftDrop account, check its details and manage access.">
      <StatsCards state={{ status: "loading" }} />
      <Card>
        <TableSkeleton />
      </Card>
    </ListPage>
  );
}

function UserManagementReady() {
  const me = useCurrentUser();

  // Filters
  const [searchInput, setSearchInput] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState<"" | Role>("");
  const [status, setStatus] = React.useState<"" | UserStatusFilter>("");
  const [registeredFrom, setRegisteredFrom] = React.useState("");
  const [registeredTo, setRegisteredTo] = React.useState("");
  const [sort, setSort] = React.useState<UserSort>("NEWEST");
  const [page, setPage] = React.useState(0);

  // Data
  const [state, setState] = React.useState<ListState>({ status: "loading" });
  const [stats, setStats] = React.useState<StatsState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  // Dialogs
  const [editing, setEditing] = React.useState<AdminUser | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<{ user: AdminUser; change: StatusChange } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const dateError =
    registeredFrom && registeredTo && registeredFrom > registeredTo
      ? "The start date must be on or before the end date."
      : null;

  // Search waits until typing pauses.
  React.useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === query) return undefined;
    const timer = window.setTimeout(() => {
      setState({ status: "loading" });
      setQuery(trimmed);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, query]);

  React.useEffect(() => {
    if (dateError) return undefined;
    const controller = new AbortController();
    userAdminApi
      .listUsers(
        {
          q: query || undefined,
          role: role || undefined,
          status: status || undefined,
          registeredFrom: registeredFrom || undefined,
          registeredTo: registeredTo || undefined,
          sort,
          page,
          size: PAGE_SIZE,
        },
        controller.signal,
      )
      .then((pageData) => setState({ status: "ready", pageData }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: isApiError(error) ? error.message : UNKNOWN_ERROR });
      });
    return () => controller.abort();
  }, [query, role, status, registeredFrom, registeredTo, sort, page, attempt, dateError]);

  React.useEffect(() => {
    const controller = new AbortController();
    userAdminApi
      .stats(controller.signal)
      .then((data) => setStats({ status: "ready", stats: data }))
      .catch(() => {
        if (!controller.signal.aborted) setStats({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = React.useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  /** Sets a filter and goes back to the first page. */
  function applyFilter(update: () => void) {
    setState({ status: "loading" });
    update();
    setPage(0);
  }

  const hasFilters = Boolean(searchInput.trim() || role || status || registeredFrom || registeredTo);

  function clearFilters() {
    applyFilter(() => {
      setSearchInput("");
      setQuery("");
      setRole("");
      setStatus("");
      setRegisteredFrom("");
      setRegisteredTo("");
    });
  }

  async function confirmStatusChange(user: AdminUser, change: StatusChange) {
    setBusyId(user.id);
    const updated = await changeUserStatus(user, change);
    setBusyId(null);
    if (updated) {
      setStatusTarget(null);
      reload();
    }
  }

  const actions = (user: AdminUser) => ({
    isSelf: me?.id === user.id,
    busy: busyId === user.id,
    onEdit: () => setEditing(user),
    onBlock: () => setStatusTarget({ user, change: "BLOCKED" }),
    onUnblock: () => setStatusTarget({ user, change: "ACTIVE" }),
  });

  return (
    <>
      <ListPage
        title="User Management"
        description="Find any SwiftDrop account, check its details and manage access."
      >
        <StatsCards state={stats} />

        <Card aria-labelledby="users-heading">
          <CardHeader
            title="Accounts"
            titleId="users-heading"
            description="Customers, merchants, couriers, dispatchers and admins"
            aside={
              state.status === "ready" ? (
                <span className="text-label text-grey-600 tabular-nums">
                  {countFormat.format(state.pageData.totalElements)}{" "}
                  {state.pageData.totalElements === 1 ? "account" : "accounts"}
                </span>
              ) : null
            }
          />

          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 border-b border-grey-200 p-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-12 lg:items-end">
            <FilterField id="user-search" label="Search" className="sm:col-span-2 lg:col-span-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-grey-500"
                  aria-hidden="true"
                />
                <Input
                  id="user-search"
                  type="search"
                  size="md"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Name, email, mobile or user ID"
                  className="pl-10 text-body-sm"
                />
              </div>
            </FilterField>

            <FilterField id="user-role" label="Role" className="lg:col-span-2">
              <Select
                id="user-role"
                size="md"
                value={role}
                onChange={(event) => applyFilter(() => setRole(event.target.value as "" | Role))}
              >
                <option value="">All roles</option>
                {ROLES.map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABEL[value]}
                  </option>
                ))}
              </Select>
            </FilterField>

            <FilterField id="user-status" label="Status" className="lg:col-span-2">
              <Select
                id="user-status"
                size="md"
                value={status}
                onChange={(event) => applyFilter(() => setStatus(event.target.value as "" | UserStatusFilter))}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FilterField>

            <FilterField id="user-sort" label="Sort by" className="sm:col-span-2 lg:col-span-2">
              <Select
                id="user-sort"
                size="md"
                value={sort}
                onChange={(event) => applyFilter(() => setSort(event.target.value as UserSort))}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FilterField>

            <div className="flex items-end lg:col-span-2 lg:justify-end">
              {hasFilters ? (
                <Button type="button" variant="tertiary" onClick={clearFilters} className="w-full lg:w-auto">
                  Clear filters
                </Button>
              ) : null}
            </div>

            <FilterField id="user-registered-from" label="Registered from" className="lg:col-span-3">
              <Input
                id="user-registered-from"
                type="date"
                size="md"
                value={registeredFrom}
                max={registeredTo || undefined}
                onChange={(event) => applyFilter(() => setRegisteredFrom(event.target.value))}
                className="text-body-sm"
              />
            </FilterField>

            <FilterField id="user-registered-to" label="Registered to" className="lg:col-span-3">
              <Input
                id="user-registered-to"
                type="date"
                size="md"
                value={registeredTo}
                min={registeredFrom || undefined}
                onChange={(event) => applyFilter(() => setRegisteredTo(event.target.value))}
                className="text-body-sm"
              />
            </FilterField>
          </div>

          {dateError ? (
            <div className="p-4 sm:p-6">
              <InlineNotice tone="error" title="Check the registration dates">
                {dateError}
              </InlineNotice>
            </div>
          ) : state.status === "error" ? (
            <div className="flex flex-col items-start gap-4 p-4 sm:p-6">
              <InlineNotice tone="error" title="We couldn't load the accounts">
                {state.message}
              </InlineNotice>
              <Button variant="secondary" onClick={reload}>
                Try again
              </Button>
            </div>
          ) : state.status === "loading" ? (
            <TableSkeleton />
          ) : state.pageData.content.length === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                icon={Users}
                title={hasFilters ? "No accounts match these filters" : "No accounts yet"}
                description={
                  hasFilters
                    ? "Try a different search, role, status or date range."
                    : "Accounts appear here as soon as people sign up or staff accounts are created."
                }
                actions={
                  hasFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Phones: one card per account */}
              <ul className="divide-y divide-grey-100 md:hidden">
                {state.pageData.content.map((user) => (
                  <li key={user.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <UserNameCell user={user} isSelf={me?.id === user.id} />
                      <UserRowMenu user={user} {...actions(user)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AccountStatusBadge status={user.status} />
                      <Badge tone="neutral" dot={false}>
                        {ROLE_LABEL[user.role]}
                      </Badge>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                      <dt className="text-grey-600">Email</dt>
                      <dd className="break-all">{user.email}</dd>
                      <dt className="text-grey-600">Mobile</dt>
                      <dd className="tabular-nums">{user.phone ? formatPhone(user.phone) : "—"}</dd>
                      <dt className="text-grey-600">Registered</dt>
                      <dd className="tabular-nums">{formatDate(user.createdAt)}</dd>
                    </dl>
                    <Button asChild variant="secondary" className="w-full">
                      <Link href={`/admin/users/${user.id}`}>View details</Link>
                    </Button>
                  </li>
                ))}
              </ul>

              {/* Tablets and desktops: table */}
              <div className="hidden md:block">
                <Table>
                  <TableCaption className="sr-only">SwiftDrop accounts</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.pageData.content.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <UserNameCell user={user} isSelf={me?.id === user.id} />
                        </TableCell>
                        <TableCell>
                          <p className="break-all">{user.email}</p>
                          <p className="text-grey-600 tabular-nums">{user.phone ? formatPhone(user.phone) : "—"}</p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-grey-700">{ROLE_LABEL[user.role]}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          <AccountStatusBadge status={user.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="secondary">
                              <Link href={`/admin/users/${user.id}`}>View</Link>
                            </Button>
                            <UserRowMenu user={user} {...actions(user)} />
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
                itemLabel="accounts"
              />
            </>
          )}
        </Card>
      </ListPage>

      <EditUserDialog
        user={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onUpdated={() => reload()}
      />

      <ChangeUserStatusDialog
        user={statusTarget?.user ?? null}
        change={statusTarget?.change ?? "BLOCKED"}
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        loading={statusTarget !== null && busyId === statusTarget.user.id}
        onConfirm={(user) => {
          if (statusTarget) void confirmStatusChange(user, statusTarget.change);
        }}
      />
    </>
  );
}

/* ---------------------------------------------------------------- Pieces */

function FilterField({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-caption text-grey-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function UserNameCell({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/users/${user.id}`}
          className="text-label font-semibold text-grey-900 hover:text-orange-700 hover:underline"
        >
          {user.fullName}
        </Link>
        {isSelf ? (
          <Badge tone="outline" dot={false}>
            You
          </Badge>
        ) : null}
      </div>
      <span className="text-caption text-grey-500 tabular-nums" title={user.id}>
        ID {shortId(user.id)}
      </span>
    </div>
  );
}

function UserRowMenu({
  user,
  isSelf,
  busy,
  onEdit,
  onBlock,
  onUnblock,
}: {
  user: AdminUser;
  isSelf: boolean;
  busy: boolean;
  onEdit: () => void;
  onBlock: () => void;
  onUnblock: () => void;
}) {
  if (user.status === "REMOVED") return null;
  const pendingMerchant = user.status === "PENDING_APPROVAL";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton variant="tertiary" label={`Actions for ${user.fullName}`} disabled={busy}>
          <EllipsisVertical className="size-5" aria-hidden="true" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden="true" />
          Edit details
        </DropdownMenuItem>
        {pendingMerchant ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/merchants">
              <Store aria-hidden="true" />
              Review application
            </Link>
          </DropdownMenuItem>
        ) : null}
        {!isSelf && (user.status === "ACTIVE" || user.status === "DISABLED") ? (
          <>
            <DropdownMenuSeparator />
            {user.status === "DISABLED" ? (
              <DropdownMenuItem onSelect={onUnblock}>
                <CircleCheck aria-hidden="true" />
                Unblock account
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={onBlock} className="text-error">
                <Ban className="text-error" aria-hidden="true" />
                Block account
              </DropdownMenuItem>
            )}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface StatCard {
  label: string;
  note: string;
  icon: LucideIcon;
  value: (stats: UserStats) => number;
}

const STAT_CARDS: StatCard[] = [
  { label: "Total users", note: "All accounts except removed", icon: Users, value: (s) => s.total },
  { label: "Active users", note: "Can log in now", icon: ShieldCheck, value: (s) => s.active },
  { label: "Blocked users", note: "Blocked by an admin", icon: UserX, value: (s) => s.blocked },
  { label: "New users", note: "Registered in the last 30 days", icon: UserPlus, value: (s) => s.newLast30Days },
];

function StatsCards({ state }: { state: StatsState }) {
  return (
    <section aria-label="Account summary" aria-busy={state.status === "loading"}>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ label, note, icon: Icon, value }) => (
          <Card key={label} className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-label text-grey-700">{label}</dt>
              <Icon className="size-5 text-grey-500" aria-hidden="true" />
            </div>
            <dd className="flex flex-col gap-1">
              {state.status === "ready" ? (
                <span className="text-display text-grey-900 tabular-nums">
                  {countFormat.format(value(state.stats))}
                </span>
              ) : state.status === "error" ? (
                <span className="text-display text-grey-400">—</span>
              ) : (
                <Skeleton className="h-10 w-20" />
              )}
              <span className="text-body-sm text-grey-600">
                {label === "Total users" && state.status === "ready" && state.stats.pending > 0
                  ? `${note} · ${countFormat.format(state.stats.pending)} pending`
                  : note}
              </span>
            </dd>
          </Card>
        ))}
      </dl>
      {state.status === "error" ? (
        <p className="mt-2 text-body-sm text-grey-600">The summary figures couldn&apos;t be loaded.</p>
      ) : null}
    </section>
  );
}

function TableSkeleton() {
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
              <TableHead>User</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoading columns={6} rows={5} label="Loading accounts" />
          </TableBody>
        </Table>
      </div>
    </>
  );
}
