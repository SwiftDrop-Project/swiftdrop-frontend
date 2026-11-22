// The admin report as a CSV file, built in the browser from the REPORT card's data (no extra request).
import type { AssistantReport } from "./types";

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function row(...values: (string | number | null | undefined)[]): string {
  return values.map(cell).join(",");
}

/** Sections separated by blank lines: summary, per day, districts, failure reasons, status now, accounts. */
export function reportToCsv(report: AssistantReport): string {
  const lines: string[] = [
    row("SwiftDrop", report.title),
    row("Period", report.rangeText),
    row("From", report.from),
    row("To", report.to),
    row("Counted to", report.countedTo),
    "",
    row("Figure", "This period", "Period before", "Difference", "Change %"),
    row(
      "Booked",
      report.booked,
      report.previous.booked,
      report.changes.booked.difference,
      report.changes.booked.percent,
    ),
    row(
      "Delivered",
      report.delivered,
      report.previous.delivered,
      report.changes.delivered.difference,
      report.changes.delivered.percent,
    ),
    row(
      "Failed",
      report.failed,
      report.previous.failed,
      report.changes.failed.difference,
      report.changes.failed.percent,
    ),
    row("Success rate %", report.successRate, report.previous.successRate),
    row("Period before", report.previous.text),
  ];
  if (report.perDay?.length) {
    lines.push("", row("Date", "Booked", "Delivered", "Failed"));
    for (const day of report.perDay) lines.push(row(day.date, day.booked, day.delivered, day.failed));
  }
  lines.push("", row("Pickup district", "Parcels"));
  for (const item of report.topPickupDistricts) lines.push(row(item.district, item.count));
  lines.push("", row("Drop-off district", "Parcels"));
  for (const item of report.topDropOffDistricts) lines.push(row(item.district, item.count));
  lines.push("", row("Failure reason", "Parcels"));
  for (const item of report.failureReasons) lines.push(row(item.reason, item.count));
  lines.push("", row("Status now", "Parcels"));
  for (const item of report.statusNow) lines.push(row(item.label, item.count));
  const accounts = report.accountsNow;
  lines.push(
    "",
    row("Accounts now", "Count"),
    row("Total", accounts.total),
    row("Customers", accounts.customers),
    row("Merchants", accounts.merchants),
    row("Couriers", accounts.couriers),
    row("Dispatchers", accounts.dispatchers),
    row("Merchants waiting for approval", accounts.pendingMerchants),
  );
  return lines.join("\r\n") + "\r\n";
}

/** "swiftdrop-weekly-report-2026-11-16.csv" */
export function reportFileName(report: AssistantReport): string {
  return `swiftdrop-${report.period.toLowerCase()}-report-${report.from}.csv`;
}
