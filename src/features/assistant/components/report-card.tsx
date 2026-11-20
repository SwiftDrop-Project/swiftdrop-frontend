"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reportFileName, reportToCsv } from "../report-csv";
import type { AssistantReport, ReportChange } from "../types";

const COUNT = new Intl.NumberFormat("en-LK");

function changeText(change: ReportChange): string {
  if (change.difference === 0) return "No change";
  const sign = change.difference > 0 ? "+" : "-";
  const percent = change.percent === null ? "" : ` (${sign}${Math.abs(change.percent)}%)`;
  return `${sign}${COUNT.format(Math.abs(change.difference))}${percent}`;
}

function Figure({ label, value, change }: { label: string; value: string; change?: ReportChange }) {
  return (
    <div className="rounded-md border border-grey-200 p-2">
      <dt className="text-caption text-grey-600">{label}</dt>
      <dd className="text-h3 tabular-nums text-grey-900">{value}</dd>
      {change ? <dd className="text-caption tabular-nums text-grey-600">{changeText(change)}</dd> : null}
    </div>
  );
}

function CountList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  return (
    <div className="space-y-1">
      <p className="text-body-sm font-medium text-grey-900">{title}</p>
      {items.length === 0 ? (
        <p className="text-caption text-grey-600">None in this period.</p>
      ) : (
        <dl className="space-y-0.5 text-body-sm">
          {items.map((item) => (
            <div key={item.name} className="flex justify-between gap-2">
              <dt className="text-grey-700">{item.name}</dt>
              <dd className="tabular-nums text-grey-900">{COUNT.format(item.count)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function download(report: AssistantReport) {
  const url = URL.createObjectURL(new Blob([reportToCsv(report)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = reportFileName(report);
  link.click();
  URL.revokeObjectURL(url);
}

/** An admin's daily, weekly or monthly service report, with a CSV download made from the same data. */
export function ReportCard({ report }: { report: AssistantReport }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-body font-medium text-grey-900">{report.title}</p>
        <p className="text-caption text-grey-600">{report.rangeText}</p>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Figure label="Booked" value={COUNT.format(report.booked)} change={report.changes.booked} />
        <Figure label="Delivered" value={COUNT.format(report.delivered)} change={report.changes.delivered} />
        <Figure label="Failed" value={COUNT.format(report.failed)} change={report.changes.failed} />
        <Figure label="Success rate" value={report.successRate === null ? "-" : `${report.successRate}%`} />
      </dl>
      <p className="text-caption text-grey-600">Changes are compared with {report.previous.text}.</p>

      {report.perDay?.length ? (
        <div className="space-y-1">
          <p className="text-body-sm font-medium text-grey-900">
            Per day
            {report.busiestDay ? (
              <span className="font-normal text-grey-600">
                {" "}
                (busiest: {report.busiestDay.dateText}, {COUNT.format(report.busiestDay.booked)} booked)
              </span>
            ) : null}
          </p>
          <div className="max-h-64 overflow-y-auto rounded-md border border-grey-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Booked</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.perDay.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{day.dateText}</TableCell>
                    <TableCell className="text-right tabular-nums">{day.booked}</TableCell>
                    <TableCell className="text-right tabular-nums">{day.delivered}</TableCell>
                    <TableCell className="text-right tabular-nums">{day.failed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <CountList
          title="Top pickup districts"
          items={report.topPickupDistricts.map((item) => ({ name: item.district, count: item.count }))}
        />
        <CountList
          title="Top drop-off districts"
          items={report.topDropOffDistricts.map((item) => ({ name: item.district, count: item.count }))}
        />
        <CountList
          title="Failure reasons"
          items={report.failureReasons.map((item) => ({ name: item.reason, count: item.count }))}
        />
        <CountList
          title="Parcels in each status now"
          items={report.statusNow.map((item) => ({ name: item.label, count: item.count }))}
        />
      </div>

      <p className="text-caption text-grey-600">
        Accounts now: {COUNT.format(report.accountsNow.total)} in total, {COUNT.format(report.accountsNow.customers)}{" "}
        customers, {COUNT.format(report.accountsNow.merchants)} merchants ({report.accountsNow.pendingMerchants} waiting
        for approval), {COUNT.format(report.accountsNow.couriers)} couriers and{" "}
        {COUNT.format(report.accountsNow.dispatchers)} dispatchers.
      </p>

      <Button variant="secondary" onClick={() => download(report)}>
        <Download aria-hidden="true" />
        Download CSV
      </Button>
    </div>
  );
}
