import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextLink } from "@/components/ui/text-link";
import { formatRs, formatTrackingNumber, humanizeCode } from "@/lib/format";
import type { AssistantCard, AssistantFacts, AssistantParcel, AssistantPrice } from "../types";
import { ReportCard } from "./report-card";

function Route({ from, to }: { from: string | null; to: string | null }) {
  if (!from && !to) return null;
  return (
    <p className="flex flex-wrap items-center gap-1 text-body-sm text-grey-700">
      <span>{from ?? "Unknown"}</span>
      <ArrowRight className="size-4 text-grey-500" aria-hidden="true" />
      <span className="sr-only">to</span>
      <span>{to ?? "Unknown"}</span>
    </p>
  );
}

function ParcelSummary({ parcel }: { parcel: AssistantParcel }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextLink href={`/track/${parcel.trackingNumber}`} className="tabular-nums">
          {formatTrackingNumber(parcel.trackingNumber)}
        </TextLink>
        <StatusBadge status={parcel.status} />
      </div>
      <p className="text-body-sm text-grey-900 first-letter:uppercase">{parcel.statusText}</p>
      <Route from={parcel.from} to={parcel.to} />
      {parcel.lastUpdate ? <p className="text-caption text-grey-600">Updated {parcel.lastUpdate}</p> : null}
    </div>
  );
}

function PriceCard({ price }: { price: AssistantPrice }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-body-sm text-grey-700">
          {price.pickupDistrict} to {price.dropOffDistrict}, {price.weightKg} kg
        </p>
        <p className="text-h3 tabular-nums text-grey-900">
          {price.total === null ? "Manual quote" : formatRs(price.total)}
        </p>
      </div>
      {price.lines.length > 0 ? (
        <dl className="space-y-1 border-t border-grey-100 pt-2 text-body-sm">
          {price.lines.map((line) => (
            <div key={line.component} className="flex justify-between gap-2">
              <dt className="text-grey-600">{humanizeCode(line.component)}</dt>
              <dd className="tabular-nums text-grey-900">{formatRs(line.amount)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {price.status !== "COMPLETE" ? <p className="text-caption text-grey-600">{price.note}</p> : null}
      <TextLink href="/rates" className="text-body-sm">
        See all rates
      </TextLink>
    </div>
  );
}

function FactsCard({ facts }: { facts: AssistantFacts }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-body-sm font-medium text-grey-900">{facts.title}</p>
        {facts.subtitle ? <p className="text-caption text-grey-600">{facts.subtitle}</p> : null}
      </div>
      <dl className="space-y-1 border-t border-grey-100 pt-2 text-body-sm">
        {facts.facts.map((fact) => (
          <div key={fact.label} className="flex justify-between gap-2">
            <dt className="text-grey-600">{fact.label}</dt>
            <dd className="tabular-nums text-grey-900">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** What a tool found, shown under the assistant's answer. */
export function AssistantCardView({ card }: { card: AssistantCard }) {
  return (
    <div className="rounded-md border border-grey-200 bg-white p-3">
      {card.type === "TRACKING" ? <ParcelSummary parcel={card.data} /> : null}
      {card.type === "PRICE" ? <PriceCard price={card.data} /> : null}
      {card.type === "REPORT" ? <ReportCard report={card.data} /> : null}
      {card.type === "FACTS" ? <FactsCard facts={card.data} /> : null}
      {card.type === "PARCEL_LIST" && card.data.total !== undefined ? (
        <p className="mb-2 text-caption text-grey-600">
          {card.data.total > card.data.parcels.length
            ? `Newest ${card.data.parcels.length} of ${card.data.total}`
            : `${card.data.total} found`}
          {card.data.filters ? `: ${card.data.filters}` : null}
        </p>
      ) : null}
      {card.type === "PARCEL_LIST" ? (
        <ul className="divide-y divide-grey-100">
          {card.data.parcels.map((parcel) => (
            <li key={parcel.trackingNumber} className="py-2 first:pt-0 last:pb-0">
              <ParcelSummary parcel={parcel} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
