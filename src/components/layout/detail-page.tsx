import * as React from "react";
import { PageColumns } from "@/components/layout/page-columns";
import { PageHeader } from "@/components/layout/page-header";

interface DetailPageProps {
  title: string;
  description?: React.ReactNode;
  /** Where "Back" goes, e.g. the list this item came from. */
  backHref: string;
  backLabel: string;
  /** Shown next to the title, e.g. <StatusBadge status="IN_TRANSIT" />. */
  status?: React.ReactNode;
  /** Page-level actions; at most one primary Button. */
  actions?: React.ReactNode;
  /** Main column: Cards with the details. */
  children: React.ReactNode;
  /** Side column (300px on wide screens): summary, timeline, help. */
  aside?: React.ReactNode;
}

/** Template for one item (a delivery, an order, a courier): back link, title with status, two columns. */
export function DetailPage({
  title,
  description,
  backHref,
  backLabel,
  status,
  actions,
  children,
  aside,
}: DetailPageProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        status={status}
        action={actions}
        backHref={backHref}
        backLabel={backLabel}
      />
      <PageColumns aside={aside}>{children}</PageColumns>
    </>
  );
}
