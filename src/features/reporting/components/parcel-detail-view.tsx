"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Package } from "lucide-react";
import * as React from "react";
import { DetailPage } from "@/components/layout/detail-page";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { PARCEL_STATUS_LABEL, StatusBadge } from "@/components/ui/status-badge";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { useDistricts } from "@/hooks/use-districts";
import { isApiError } from "@/lib/api";
import { formatDateTime, formatPhone, formatRs, formatTrackingNumber, humanizeCode } from "@/lib/format";
import { ROLE_LABEL, isRole } from "@/lib/roles";
import { reportingApi } from "../api";
import { FAILURE_REASON_LABEL, SENDER_TYPE_LABEL } from "../lib/parcel-labels";
import type { AdminParcelDetail, ParcelContact, ParcelTrackingEntry } from "../types";

type DetailState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | { status: "ready"; parcel: AdminParcelDetail };

const BACK = { backHref: "/admin/parcels", backLabel: "All Parcels" };

function ParcelDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading parcel details" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

/** One parcel for the admin (GET /admin/parcels/{id}): contacts, parcel, outcome, sender account and history. */
export function ParcelDetailView({ parcelId }: { parcelId?: string }) {
  const params = useParams<{ id?: string }>();
  const id = parcelId ?? params.id ?? "";
  const districts = useDistricts();
  const [state, setState] = React.useState<DetailState>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  const [prevId, setPrevId] = React.useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setState({ status: "loading" });
  }

  React.useEffect(() => {
    const controller = new AbortController();
    reportingApi
      .getParcel(id, controller.signal)
      .then((parcel) => setState({ status: "ready", parcel }))
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

  const districtName = (code: string | null) =>
    code ? (districts.districts.find((district) => district.code === code)?.name ?? humanizeCode(code)) : "—";

  if (state.status === "loading") return <ParcelDetailSkeleton />;

  if (state.status === "notFound") {
    return (
      <>
        <PageHeader title="Parcel not found" {...BACK} />
        <Card className="p-6 sm:p-10">
          <EmptyState
            icon={Package}
            title="This parcel couldn't be found"
            description="Check the link or go back to All Parcels."
            actions={
              <Button asChild>
                <Link href="/admin/parcels">Back to All Parcels</Link>
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
        <PageHeader title="Parcel details" {...BACK} />
        <div className="flex max-w-form-app flex-col items-start gap-4">
          <InlineNotice tone="error" title="We couldn't load this parcel">
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

  const { parcel } = state;
  const timeline: TimelineItem[] = parcel.history.map((entry, index) => ({
    id: `${entry.occurredAt}-${index}`,
    title: PARCEL_STATUS_LABEL[entry.status],
    description: describe(entry, districtName),
    timestamp: entry.occurredAt,
    tone: entry.status === "DELIVERED" ? "success" : entry.status === "FAILED" ? "error" : "default",
  }));

  return (
    <DetailPage
      title={formatTrackingNumber(parcel.trackingNumber)}
      description={`Parcel ID ${parcel.id}`}
      {...BACK}
      status={<StatusBadge status={parcel.status} />}
      aside={
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-h3 text-grey-900">Tracking history</h2>
            <p className="mt-1 text-body-sm text-grey-600">Newest first, in Sri Lanka time.</p>
            {timeline.length > 0 ? (
              <Timeline items={timeline} className="mt-4" />
            ) : (
              <p className="mt-4 text-body-sm text-grey-600">No status changes recorded yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-h3 text-grey-900">Booked by</h2>
            <dl className="mt-4 flex flex-col gap-4">
              <Field label="Account type">{SENDER_TYPE_LABEL[parcel.sender.type]}</Field>
              {parcel.sender.businessName ? <Field label="Business">{parcel.sender.businessName}</Field> : null}
              <Field label="Account holder">{parcel.sender.accountName ?? "Account no longer exists"}</Field>
              {parcel.sender.accountEmail ? (
                <Field label="Email">
                  <span className="break-all">{parcel.sender.accountEmail}</span>
                </Field>
              ) : null}
              {parcel.sender.accountName ? (
                <Field label="Account">
                  <Link
                    href={`/admin/users/${parcel.sender.accountId}`}
                    className="text-orange-700 hover:text-orange-800 hover:underline"
                  >
                    Open in User Management
                  </Link>
                </Field>
              ) : null}
            </dl>
          </Card>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {parcel.status === "FAILED" && parcel.failureReason ? (
          <InlineNotice tone="error" title="The last delivery attempt failed">
            {FAILURE_REASON_LABEL[parcel.failureReason]}. The parcel goes back to a branch for another try.
          </InlineNotice>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <ContactCard title="Sender (pickup)" contact={parcel.pickup} districtName={districtName} />
          <ContactCard title="Receiver (delivery)" contact={parcel.recipient} districtName={districtName} />
        </div>

        <DetailCard title="Parcel information">
          <Field label="Weight">
            <span className="tabular-nums">{parcel.weightKg} kg</span>
          </Field>
          <Field label="Delivery fee">
            <span className="tabular-nums">{formatRs(parcel.feeAmount)}</span>
          </Field>
          <Field label="Payment">
            {parcel.codAmount !== null ? (
              <span className="tabular-nums">Cash on delivery: {formatRs(parcel.codAmount)}</span>
            ) : (
              "Prepaid"
            )}
          </Field>
          <Field label="Booked">
            <span className="tabular-nums">{formatDateTime(parcel.createdAt)}</span>
          </Field>
          <Field label="Last updated">
            <span className="tabular-nums">{formatDateTime(parcel.updatedAt)}</span>
          </Field>
          {parcel.currentBranch ? <Field label="Now at">{districtName(parcel.currentBranch)} branch</Field> : null}
          {parcel.merchantOrderRef ? (
            <Field label="Merchant order ref">
              <span className="break-all">{parcel.merchantOrderRef}</span>
            </Field>
          ) : null}
          <Field label="Instructions" wide>
            {parcel.instructions ?? "None"}
          </Field>
        </DetailCard>

        {parcel.status === "DELIVERED" ? (
          <DetailCard title="Proof of delivery">
            <Field label="Received by">{parcel.proofRecipientName ?? "Not recorded"}</Field>
            <Field label="Photo">{parcel.hasProofPhoto ? "Photo on file" : "No photo"}</Field>
          </DetailCard>
        ) : null}
      </div>
    </DetailPage>
  );
}

/** Where or why, for one history entry: the branch, the failure reason, the note and who made the change. */
function describe(entry: ParcelTrackingEntry, districtName: (code: string | null) => string): React.ReactNode {
  const parts: string[] = [];
  if (entry.branch) parts.push(`${districtName(entry.branch)} branch`);
  if (entry.failureReason) parts.push(FAILURE_REASON_LABEL[entry.failureReason]);
  if (entry.note) parts.push(entry.note);
  if (entry.actorRole) {
    const who = isRole(entry.actorRole) ? ROLE_LABEL[entry.actorRole] : humanizeCode(entry.actorRole);
    parts.push(`By ${who.toLowerCase()}`);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function ContactCard({
  title,
  contact,
  districtName,
}: {
  title: string;
  contact: ParcelContact;
  districtName: (code: string | null) => string;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-h3 text-grey-900">{title}</h2>
      <dl className="mt-4 flex flex-col gap-4">
        <Field label="Name">{contact.name}</Field>
        <Field label="Mobile">
          <span className="tabular-nums">{formatPhone(contact.phone)}</span>
        </Field>
        <Field label="Address">
          {contact.addressLine}, {contact.city}, {districtName(contact.district)}
        </Field>
      </dl>
    </Card>
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

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "flex flex-col gap-1 sm:col-span-2" : "flex flex-col gap-1"}>
      <dt className="text-caption text-grey-600 uppercase">{label}</dt>
      <dd className="text-body-sm text-grey-900">{children}</dd>
    </div>
  );
}
