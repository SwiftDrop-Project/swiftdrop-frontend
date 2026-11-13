"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Headset, Plus, Search } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { ListPage } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { TextButton } from "@/components/ui/text-link";
import { toast } from "@/components/ui/toast";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { formatDate, formatPhone, humanizeCode } from "@/lib/format";
import type { PageResponse } from "@/types";
import { staffApi } from "../api";
import {
  createDispatcherSchema,
  type CreateDispatcherInput,
  type CreateDispatcherValues,
} from "../schemas";
import type { DispatcherDetail } from "../types";
import { RequireCurrentUser } from "./require-current-user";
import { StaffStatusBadge } from "./staff-status-badge";

const PAGE_SIZE = 20;
const UNKNOWN_ERROR = "Something went wrong on our side. Try again in a moment.";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pageData: PageResponse<DispatcherDetail> };

function DispatcherDirectorySkeleton() {
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
              <TableHead>Dispatcher</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoading columns={6} rows={3} label="Loading dispatchers" />
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function DispatcherManagementFallback() {
  return (
    <ListPage
      title="Dispatcher Management"
      description="Provision branch dispatcher accounts with mandatory first-login password change."
    >
      <Card aria-labelledby="dispatchers-heading-loading">
        <div className="flex items-center justify-between gap-4 border-b border-grey-200 px-4 py-4 sm:px-6">
          <h2 id="dispatchers-heading-loading" className="text-h3 text-grey-900">
            Dispatcher directory
          </h2>
        </div>
        <DispatcherDirectorySkeleton />
      </Card>
    </ListPage>
  );
}

export function DispatcherManagement() {
  return (
    <RequireCurrentUser fallback={<DispatcherManagementFallback />}>
      <DispatcherManagementReady />
    </RequireCurrentUser>
  );
}

function DispatcherManagementReady() {
  const districts = useDistricts();
  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<ListState>({ status: "loading" });
  const [createOpen, setCreateOpen] = React.useState(false);

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
      .listDispatchers(
        {
          q: debouncedQuery || undefined,
          branch: branchFilter || undefined,
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
  }, [debouncedQuery, branchFilter, page, attempt]);

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

  const hasFilters = Boolean(searchInput.trim() || branchFilter);

  function clearFilters() {
    setState({ status: "loading" });
    setSearchInput("");
    setDebouncedQuery("");
    setBranchFilter("");
    setPage(0);
  }

  const toolbar = (
    <>
      <div className="relative w-full sm:max-w-xs">
        <label htmlFor="dispatcher-search" className="sr-only">
          Search dispatchers
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-grey-600"
          aria-hidden="true"
        />
        <Input
          id="dispatcher-search"
          type="search"
          size="md"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search name, email or mobile"
          className="pl-12 text-body-sm"
        />
      </div>

      <div className="w-full sm:w-48">
        <label htmlFor="dispatcher-branch-filter" className="sr-only">
          Filter by branch
        </label>
        <Select
          id="dispatcher-branch-filter"
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
        title="Dispatcher Management"
        description="Provision branch dispatcher accounts with mandatory first-login password change."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Add dispatcher
          </Button>
        }
        toolbar={toolbar}
      >
        <Card aria-labelledby="dispatchers-heading">
          <div className="flex items-center justify-between gap-4 border-b border-grey-200 px-4 py-4 sm:px-6">
            <h2 id="dispatchers-heading" className="text-h3 text-grey-900">
              Dispatcher directory
            </h2>
            {state.status === "ready" ? (
              <p className="text-label text-grey-600 tabular-nums">
                {state.pageData.totalElements}{" "}
                {state.pageData.totalElements === 1 ? "dispatcher" : "dispatchers"}
              </p>
            ) : null}
          </div>

          {state.status === "error" ? (
            <div className="flex flex-col items-start gap-4 p-4 sm:p-6">
              <InlineNotice tone="error" title="We couldn't load dispatchers">
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
                      <TableHead>Dispatcher</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableLoading columns={6} rows={3} label="Loading dispatchers" />
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}

          {state.status === "ready" && state.pageData.content.length === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                icon={Headset}
                title={hasFilters ? "No dispatchers match these filters" : "No dispatchers added yet"}
                description={
                  hasFilters
                    ? "Try a different search term or branch filter."
                    : "Create a dispatcher account so branch staff can assign parcels and monitor routes."
                }
                actions={
                  hasFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus aria-hidden="true" />
                      Add dispatcher
                    </Button>
                  )
                }
              />
            </div>
          ) : null}

          {state.status === "ready" && state.pageData.content.length > 0 ? (
            <>
              <ul className="divide-y divide-grey-100 md:hidden">
                {state.pageData.content.map((dispatcher) => (
                  <li key={dispatcher.id} className="flex flex-col gap-4 p-4">
                    <div>
                      <Link
                        href={`/admin/dispatchers/${dispatcher.id}`}
                        className="text-label font-semibold text-grey-900 hover:text-orange-700 hover:underline"
                      >
                        {dispatcher.fullName}
                      </Link>
                      <p className="mt-0.5 break-all text-body-sm text-grey-600">{dispatcher.email}</p>
                    </div>

                    <StaffStatusBadge
                      status={dispatcher.status}
                      mustChangePassword={dispatcher.mustChangePassword}
                    />

                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                      <dt className="text-grey-600">Mobile</dt>
                      <dd className="tabular-nums">
                        {dispatcher.phone ? formatPhone(dispatcher.phone) : "—"}
                      </dd>
                      <dt className="text-grey-600">Branch</dt>
                      <dd>{districtName(dispatcher.branch)}</dd>
                      <dt className="text-grey-600">Created</dt>
                      <dd className="tabular-nums">{formatDate(dispatcher.createdAt)}</dd>
                    </dl>

                    <Button asChild variant="secondary" className="w-full">
                      <Link href={`/admin/dispatchers/${dispatcher.id}`}>View details</Link>
                    </Button>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatcher</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.pageData.content.map((dispatcher) => (
                      <TableRow key={dispatcher.id}>
                        <TableCell>
                          <Link
                            href={`/admin/dispatchers/${dispatcher.id}`}
                            className="text-label font-semibold text-grey-900 hover:text-orange-700 hover:underline"
                          >
                            {dispatcher.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="break-all">{dispatcher.email}</p>
                          <p className="text-grey-600 tabular-nums">
                            {dispatcher.phone ? formatPhone(dispatcher.phone) : "—"}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {districtName(dispatcher.branch)}
                        </TableCell>
                        <TableCell>
                          <StaffStatusBadge
                            status={dispatcher.status}
                            mustChangePassword={dispatcher.mustChangePassword}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDate(dispatcher.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="secondary">
                            <Link href={`/admin/dispatchers/${dispatcher.id}`}>View</Link>
                          </Button>
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
                itemLabel="dispatchers"
              />
            </>
          ) : null}
        </Card>
      </ListPage>

      <CreateDispatcherDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setPage(0);
          reload();
        }}
      />
    </>
  );
}

function CreateDispatcherDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (dispatcher: DispatcherDetail) => void;
}) {
  const districts = useDistricts();
  const [notice, setNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDispatcherInput, unknown, CreateDispatcherValues>({
    resolver: zodResolver(createDispatcherSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      branch: "",
      email: "",
      password: "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
      setNotice(null);
    }
    onOpenChange(nextOpen);
  }

  const branchPlaceholder =
    districts.status === "loading"
      ? "Loading branches…"
      : districts.status === "error"
        ? "Couldn't load branches"
        : "Select a branch";

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const created = await staffApi.createDispatcher(values);
      toast({
        tone: "success",
        title: "Dispatcher created",
        description: `${created.fullName} must change their temporary password on first login.`,
      });
      handleOpenChange(false);
      onCreated(created);
    } catch (error) {
      if (!isApiError(error)) {
        setNotice(UNKNOWN_ERROR);
        return;
      }
      if (error.code === "EMAIL_ALREADY_REGISTERED") {
        setError("email", { message: error.message });
        return;
      }
      if (error.code === "PHONE_ALREADY_REGISTERED") {
        setError("phone", { message: error.message });
        return;
      }
      if (error.code === "VALIDATION_FAILED") {
        const { handled, unmatched } = applyServerFieldErrors(error, setError, [
          "fullName",
          "phone",
          "branch",
          "email",
          "password",
        ]);
        if (handled && unmatched.length === 0) return;
        setNotice(unmatched[0] ?? error.message);
        return;
      }
      setNotice(error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Add dispatcher</DialogTitle>
          <DialogDescription>
            Create a branch dispatcher account with an initial password. They&apos;ll be required to set a new
            password when they first sign in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogBody className="gap-5">
            {notice ? (
              <InlineNotice tone="error" title="We couldn't create the dispatcher">
                {notice}
              </InlineNotice>
            ) : null}

            <FormField id="create-dispatcher-fullName" label="Full name" error={errors.fullName?.message}>
              {(a11y) => (
                <Input
                  {...a11y}
                  {...register("fullName")}
                  size="md"
                  autoComplete="off"
                  placeholder="e.g. Dilini Perera"
                />
              )}
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <FormField id="create-dispatcher-phone" label="Mobile number" error={errors.phone?.message}>
                {(a11y) => (
                  <PhoneInput {...a11y} {...register("phone")} size="md" placeholder="77 123 4567" />
                )}
              </FormField>

              <FormField
                id="create-dispatcher-branch"
                label="Branch"
                error={errors.branch?.message}
                helper={
                  districts.status === "error" ? (
                    <TextButton onClick={districts.retry}>Try loading branches again</TextButton>
                  ) : undefined
                }
              >
                {(a11y) => (
                  <Select
                    {...a11y}
                    {...register("branch")}
                    size="md"
                    disabled={districts.status !== "ready"}
                  >
                    <option value="" disabled>
                      {branchPlaceholder}
                    </option>
                    {districts.districts.map((district) => (
                      <option key={district.code} value={district.code}>
                        {district.name}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            </div>

            <FormField id="create-dispatcher-email" label="Login email" error={errors.email?.message}>
              {(a11y) => (
                <Input
                  {...a11y}
                  {...register("email")}
                  type="email"
                  size="md"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="dispatcher@swiftdrop.lk"
                />
              )}
            </FormField>

            <FormField
              id="create-dispatcher-password"
              label="Initial password"
              helper="At least 8 characters, including a number. Required to be changed on first login."
              error={errors.password?.message}
            >
              {(a11y) => (
                <PasswordInput
                  {...a11y}
                  {...register("password")}
                  size="md"
                  autoComplete="new-password"
                />
              )}
            </FormField>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={isSubmitting}>
              Create dispatcher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
