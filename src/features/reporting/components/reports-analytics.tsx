"use client";

import { Download, RotateCw } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { reportingApi } from "../api";
import { useReportSummary } from "../hooks/use-report-summary";
import {
  REPORT_PRESETS,
  daysBetween,
  formatRange,
  presetRange,
  rangeProblem,
  sriLankaToday,
  type ReportPreset,
} from "../lib/report-range";
import type { ReportRange } from "../types";
import { DailyVolumeCard } from "./daily-volume-card";
import { ReportFigures } from "./report-figures";
import { StatusBreakdownCard } from "./status-breakdown-card";

/**
 * The admin's Reports & Analytics page (/admin/reports): delivery volume for a range of Sri Lanka days, compared with
 * the period before it, parcels per day and parcels by status, with a CSV download. The filters sit in one row above
 * everything and scope all of it. Read only.
 */
export function ReportsAnalytics() {
  const today = React.useMemo(() => sriLankaToday(), []);
  const [preset, setPreset] = React.useState<ReportPreset>("LAST_30_DAYS");
  const [custom, setCustom] = React.useState<ReportRange>(() => presetRange("LAST_30_DAYS", today));

  const range: ReportRange = preset === "CUSTOM" ? custom : presetRange(preset, today);
  const problem = preset === "CUSTOM" ? rangeProblem(custom, today) : null;
  const { state, refreshing, retry } = useReportSummary(problem ? null : range);

  const summary = state.status === "ready" ? state.data : null;
  const days = daysBetween(range);
  const previousLabel = `the previous ${days} ${days === 1 ? "day" : "days"}`;

  function choosePreset(value: ReportPreset) {
    // Starting a custom range from what is on screen is friendlier than from empty dates.
    if (value === "CUSTOM" && preset !== "CUSTOM") setCustom(range);
    setPreset(value);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters: one row above everything they scope. */}
      <div className="flex flex-col gap-4 rounded-lg border border-grey-200 bg-white p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <FormField id="report-period" label="Period" className="sm:w-48">
            {(a11y) => (
              <Select {...a11y} size="md" value={preset} onChange={(event) => choosePreset(event.target.value as ReportPreset)}>
                {REPORT_PRESETS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          {preset === "CUSTOM" ? (
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
              <FormField id="report-from" label="From" className="sm:w-44">
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="date"
                    size="md"
                    max={today}
                    value={custom.from}
                    onChange={(event) => setCustom((current) => ({ ...current, from: event.target.value }))}
                  />
                )}
              </FormField>
              <FormField id="report-to" label="To" className="sm:w-44">
                {(a11y) => (
                  <Input
                    {...a11y}
                    type="date"
                    size="md"
                    max={today}
                    value={custom.to}
                    onChange={(event) => setCustom((current) => ({ ...current, to: event.target.value }))}
                  />
                )}
              </FormField>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-body-sm text-grey-600" aria-live="polite">
            {problem ? null : formatRange(range)}
            {refreshing ? <span className="ml-2 text-grey-500">Updating…</span> : null}
          </p>
          {problem ? (
            <Button variant="secondary" disabled>
              <Download aria-hidden="true" />
              Download CSV
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <a href={reportingApi.summaryExportUrl(range)} download>
                <Download aria-hidden="true" />
                Download CSV
              </a>
            </Button>
          )}
        </div>
      </div>

      {problem ? (
        <InlineNotice tone="error" title="Check the dates">
          <p>{problem}</p>
        </InlineNotice>
      ) : null}

      {state.status === "error" ? (
        <InlineNotice tone="error" title="We couldn't load the report">
          <p>{state.message}</p>
          <Button variant="secondary" className="mt-3" onClick={retry}>
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        </InlineNotice>
      ) : (
        // While another range loads, the last report stays, dimmed, so the page keeps its shape.
        <div
          className="flex flex-col gap-6 transition-opacity"
          style={{ opacity: refreshing ? 0.6 : 1 }}
          aria-busy={summary === null || refreshing}
        >
          <ReportFigures summary={summary} previousLabel={previousLabel} />
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <DailyVolumeCard days={summary ? summary.perDay : null} />
            <StatusBreakdownCard byStatus={summary ? summary.byStatus : null} />
          </div>
        </div>
      )}
    </div>
  );
}
