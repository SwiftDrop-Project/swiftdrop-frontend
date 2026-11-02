import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";

interface ListPageProps {
  title: string;
  description?: React.ReactNode;
  /** One primary Button, e.g. "Create delivery". */
  action?: React.ReactNode;
  /** Search and filters above the list. */
  toolbar?: React.ReactNode;
  /** Usually a Card holding a Table (with TableLoading / TableEmpty) and a Pagination. */
  children: React.ReactNode;
}

/**
 * Template for pages that list things (My deliveries, Orders, Couriers):
 * PageHeader, optional toolbar, then the list.
 */
export function ListPage({ title, description, action, toolbar, children }: ListPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} action={action} />
      <div className="flex flex-col gap-6">
        {toolbar ? <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">{toolbar}</div> : null}
        {children}
      </div>
    </>
  );
}
