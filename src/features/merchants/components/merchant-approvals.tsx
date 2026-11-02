"use client";

import { Store } from "lucide-react";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { formatDate, formatPhone, humanizeCode } from "@/lib/format";
import { parcelsPerMonthLabel } from "@/lib/reference";
import { merchantsApi } from "../api";
import type { MerchantApplication } from "../types";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: MerchantApplication[] };

type Decision = "approve" | "reject";

interface Announcement {
  tone: "info" | "error";
  title: string;
  body?: string;
}

/** Pending merchant applications (GET /admin/merchants?status=PENDING) with Approve / Reject. */
export function MerchantApprovals() {
  const [state, setState] = React.useState<ListState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const [busy, setBusy] = React.useState<Record<string, Decision>>({});
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(null);
  const announcementRef = React.useRef<HTMLDivElement>(null);
  const districts = useDistricts();

  React.useEffect(() => {
    const controller = new AbortController();
    merchantsApi
      .listMerchants("PENDING", controller.signal)
      .then((items) => setState({ status: "ready", items }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: isApiError(error) ? error.message : "Something went wrong. Try again in a moment.",
        });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = () => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  };

  const districtName = (code: string) =>
    districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code);

  async function decide(application: MerchantApplication, decision: Decision) {
    const { userId, businessName } = application;
    setBusy((current) => ({ ...current, [userId]: decision }));
    setAnnouncement(null);
    try {
      if (decision === "approve") await merchantsApi.approveMerchant(userId);
      else await merchantsApi.rejectMerchant(userId);

      setState((current) =>
        current.status === "ready"
          ? { ...current, items: current.items.filter((item) => item.userId !== userId) }
          : current,
      );
      setAnnouncement(
        decision === "approve"
          ? { tone: "info", title: `${businessName} approved`, body: "They can now log in and send orders." }
          : { tone: "info", title: `${businessName} rejected`, body: "They can't log in to SwiftDrop." },
      );
    } catch (error) {
      setAnnouncement({
        tone: "error",
        title: `We couldn't ${decision} ${businessName}`,
        body: isApiError(error) ? error.message : "Try again in a moment.",
      });
    } finally {
      setBusy((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
      // The row is gone, so move focus somewhere sensible: the result message.
      requestAnimationFrame(() => announcementRef.current?.focus());
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={announcementRef} tabIndex={-1} className="outline-none empty:hidden">
        {announcement ? (
          <InlineNotice tone={announcement.tone} title={announcement.title}>
            {announcement.body}
          </InlineNotice>
        ) : null}
      </div>

      <Card aria-labelledby="pending-heading">
        <div className="flex items-center justify-between gap-4 border-b border-grey-200 px-4 py-4 sm:px-6">
          <h2 id="pending-heading" className="text-h3 text-grey-900">
            Waiting for approval
          </h2>
          {state.status === "ready" ? (
            <p className="text-label text-grey-600 tabular-nums">
              {state.items.length} {state.items.length === 1 ? "application" : "applications"}
            </p>
          ) : null}
        </div>

        {state.status === "loading" ? <LoadingRows /> : null}

        {state.status === "error" ? (
          <div className="flex flex-col items-start gap-4 p-4 sm:p-6">
            <InlineNotice tone="error" title="We couldn't load merchant applications">
              {state.message}
            </InlineNotice>
            <Button variant="secondary" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : null}

        {state.status === "ready" && state.items.length === 0 ? (
          <div className="p-6 sm:p-10">
            <EmptyState
              icon={Store}
              title="No merchants waiting for approval"
              description="New merchant applications will appear here, oldest first."
            />
          </div>
        ) : null}

        {state.status === "ready" && state.items.length > 0 ? (
          <>
            {/* Phones: one card per application */}
            <ul className="divide-y divide-grey-100 md:hidden">
              {state.items.map((application) => (
                <li key={application.userId} className="flex flex-col gap-4 p-4">
                  <div>
                    <p className="text-label text-grey-900">{application.businessName}</p>
                    <p className="text-body-sm text-grey-600">{application.contactPerson}</p>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                    <dt className="text-grey-600">Email</dt>
                    <dd className="min-w-0 break-words">{application.email}</dd>
                    <dt className="text-grey-600">Mobile</dt>
                    <dd className="tabular-nums">{formatPhone(application.phone)}</dd>
                    <dt className="text-grey-600">Pickup</dt>
                    <dd>
                      {application.city}, {districtName(application.pickupDistrict)}
                    </dd>
                    <dt className="text-grey-600">Parcels</dt>
                    <dd>{parcelsPerMonthLabel(application.parcelsPerMonth)} a month</dd>
                    <dt className="text-grey-600">Applied</dt>
                    <dd className="tabular-nums">{formatDate(application.createdAt)}</dd>
                  </dl>
                  <DecisionButtons
                    application={application}
                    busy={busy[application.userId]}
                    onDecide={decide}
                  />
                </li>
              ))}
            </ul>

            {/* Tablet and up: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Parcels a month</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.items.map((application) => (
                    <TableRow key={application.userId}>
                      <TableCell>
                        <p className="text-label text-grey-900">{application.businessName}</p>
                        <p className="text-grey-600">{application.contactPerson}</p>
                      </TableCell>
                      <TableCell>
                        <p className="break-all">{application.email}</p>
                        <p className="text-grey-600 tabular-nums">{formatPhone(application.phone)}</p>
                      </TableCell>
                      <TableCell>
                        <p>{districtName(application.pickupDistrict)}</p>
                        <p className="text-grey-600">{application.city}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {parcelsPerMonthLabel(application.parcelsPerMonth)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDate(application.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DecisionButtons
                          application={application}
                          busy={busy[application.userId]}
                          onDecide={decide}
                          className="justify-end"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}

function DecisionButtons({
  application,
  busy,
  onDecide,
  className,
}: {
  application: MerchantApplication;
  busy?: Decision;
  onDecide: (application: MerchantApplication, decision: Decision) => void;
  className?: string;
}) {
  const name = application.businessName;
  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Button
        variant="secondary"
        disabled={Boolean(busy)}
        loading={busy === "approve"}
        onClick={() => onDecide(application, "approve")}
        aria-label={`Approve ${name}`}
      >
        Approve
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="tertiary"
            disabled={Boolean(busy)}
            loading={busy === "reject"}
            aria-label={`Reject ${name}`}
          >
            Reject
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {application.contactPerson} won&apos;t be able to log in or send orders. The application
              will leave this list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={() => onDecide(application, "reject")}>Reject merchant</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoadingRows() {
  return (
    <div aria-busy="true" aria-label="Loading merchant applications" className="flex flex-col">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-6 border-b border-grey-100 px-4 py-4 last:border-b-0 sm:px-6">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="hidden h-4 w-48 md:block" />
          <Skeleton className="h-10 w-40" />
        </div>
      ))}
    </div>
  );
}
